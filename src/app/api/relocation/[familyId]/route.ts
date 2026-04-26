import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionContext, toAuthErrorResponse, audit } from '@/lib/server-auth';
import { clientIp } from '@/lib/rate-limit';

export async function GET(request: NextRequest, { params }: { params: Promise<{ familyId: string }> }) {
  try {
    const ctx = await getSessionContext();
    const { familyId } = await params;

    const [family, plotAllotment] = await Promise.all([
      db.family.findFirst({
        where: { id: familyId, deletedAt: null },
        include: {
          village: {
            select: { id: true, name: true, nameTelugu: true, latitude: true, longitude: true, mandalId: true },
          },
          firstScheme: true,
        },
      }),
      db.plotAllotment.findUnique({
        where: { familyId },
      }),
    ]);

    if (!family) {
      return NextResponse.json({ error: 'Family not found', code: 404 }, { status: 404 });
    }

    if (ctx.role === 'OFFICER' && ctx.mandalId !== family.village.mandalId) {
      return NextResponse.json({ error: 'Forbidden — outside assigned mandal', code: 403 }, { status: 403 });
    }

    if (ctx.role !== 'PUBLIC') {
      await audit({
        ctx,
        action: 'RELOCATION_VIEW',
        resourceType: 'FAMILY',
        resourceId: familyId,
        ip: clientIp(request),
        userAgent: request.headers.get('user-agent') ?? null,
      });
    }

    return NextResponse.json({
      family: {
        id: family.id,
        pdfId: family.pdfId,
        beneficiaryName: family.beneficiaryName,
        village: family.village,
        rrEligibility: family.rrEligibility,
        firstScheme: family.firstScheme,
      },
      plotAllotment,
      originalLocation: {
        latitude: family.village.latitude,
        longitude: family.village.longitude,
        name: family.village.name,
        nameTelugu: family.village.nameTelugu,
      },
    });
  } catch (err) {
    const r = toAuthErrorResponse(err);
    if (r) return r;
    console.error('Relocation API error:', err);
    return NextResponse.json({ error: 'Failed to fetch relocation data', code: 500 }, { status: 500 });
  }
}
