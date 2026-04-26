import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionContext, toAuthErrorResponse, audit } from '@/lib/server-auth';
import { serializeMember } from '@/lib/pii';
import { canSeeFullPII } from '@/lib/roles';
import { clientIp } from '@/lib/rate-limit';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getSessionContext();
    const { id } = await params;
    const member = await db.familyMember.findUnique({
      where: { id },
      include: {
        family: {
          select: {
            id: true, pdfId: true, beneficiaryName: true,
            village: {
              select: { id: true, name: true, nameTelugu: true, mandal: { select: { id: true, name: true, nameTelugu: true } } },
            },
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found', code: 404 }, { status: 404 });
    }

    const targetMandalId = member.family?.village?.mandal?.id ?? null;
    if (ctx.role === 'OFFICER' && targetMandalId && ctx.mandalId !== targetMandalId) {
      return NextResponse.json({ error: 'Forbidden — outside assigned mandal', code: 403 }, { status: 403 });
    }

    if (ctx.role !== 'PUBLIC') {
      await audit({
        ctx,
        action: canSeeFullPII(ctx, targetMandalId) ? 'MEMBER_VIEW_FULL_PII' : 'MEMBER_VIEW_MASKED',
        resourceType: 'MEMBER',
        resourceId: id,
        ip: clientIp(request),
        userAgent: request.headers.get('user-agent') ?? null,
      });
    }

    const serialized = serializeMember(member, ctx, targetMandalId);
    return NextResponse.json({
      ...serialized,
      family: member.family ? {
        id: member.family.id,
        pdfId: member.family.pdfId,
        beneficiaryName: member.family.beneficiaryName,
        village: member.family.village,
      } : null,
    });
  } catch (err) {
    const r = toAuthErrorResponse(err);
    if (r) return r;
    console.error('Member API error:', err);
    return NextResponse.json({ error: 'Failed to fetch member', code: 500 }, { status: 500 });
  }
}
