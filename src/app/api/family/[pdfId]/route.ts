import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionContext, toAuthErrorResponse, audit } from '@/lib/server-auth';
import { serializeFamily } from '@/lib/pii';
import { canSeeFullPII } from '@/lib/roles';
import { clientIp } from '@/lib/rate-limit';

export async function GET(request: NextRequest, { params }: { params: Promise<{ pdfId: string }> }) {
  try {
    const ctx = await getSessionContext();
    const { pdfId } = await params;

    const family = await db.family.findFirst({
      where: { pdfId, deletedAt: null },
      include: {
        village: {
          include: {
            mandal: { select: { id: true, name: true, nameTelugu: true, code: true, color: true } },
          },
        },
        members: { orderBy: [{ relation: 'asc' }, { age: 'desc' }] },
        firstScheme: true,
        plotAllotment: true,
      },
    });

    if (!family) {
      return NextResponse.json({ error: 'Family not found', code: 404 }, { status: 404 });
    }

    const targetMandalId = family.village?.mandal?.id ?? null;

    // Officer scope enforcement: officers may only view families in their assigned mandal.
    if (ctx.role === 'OFFICER' && targetMandalId && ctx.mandalId !== targetMandalId) {
      return NextResponse.json({ error: 'Forbidden — outside assigned mandal', code: 403 }, { status: 403 });
    }

    if (ctx.role !== 'PUBLIC') {
      await audit({
        ctx,
        action: canSeeFullPII(ctx, targetMandalId) ? 'FAMILY_VIEW_FULL_PII' : 'FAMILY_VIEW_MASKED',
        resourceType: 'FAMILY',
        resourceId: pdfId,
        ip: clientIp(request),
        userAgent: request.headers.get('user-agent') ?? null,
      });
    }

    return NextResponse.json(serializeFamily(family, ctx));
  } catch (err) {
    const r = toAuthErrorResponse(err);
    if (r) return r;
    console.error('Family API error:', err);
    return NextResponse.json({ error: 'Failed to fetch family', code: 500 }, { status: 500 });
  }
}
