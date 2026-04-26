import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession, requireRole, toAuthErrorResponse, audit } from '@/lib/server-auth';
import { encryptPII, hashPII } from '@/lib/crypto';
import { rateLimit, clientIp } from '@/lib/rate-limit';

/* ──────────────────────────────────────────────────────────────────
 * Admin Families API — ADMIN-only writes; ADMIN/OFFICER/VIEWER reads.
 * All PII fields received from clients are encrypted at rest.
 * Deletes are SOFT (deletedAt) so that audits and references survive.
 * ────────────────────────────────────────────────────────────────── */

const FamilyCreateSchema = z.object({
  pdfId: z.string().min(1).max(64),
  beneficiaryName: z.string().min(1).max(200),
  villageId: z.string().min(1),
  fathersName: z.string().max(200).nullish(),
  husbandName: z.string().max(200).nullish(),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  rrEligibility: z.string().max(40).optional(),
  caste: z.string().max(40).nullish(),
  subCaste: z.string().max(80).nullish(),
  houseType: z.string().max(40).nullish(),
  occupation: z.string().max(120).nullish(),
});

const FamilyUpdateSchema = z.object({
  pdfId: z.string().min(1),
  beneficiaryName: z.string().min(1).max(200).optional(),
  fathersName: z.string().max(200).nullish(),
  husbandName: z.string().max(200).nullish(),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  villageId: z.string().min(1).optional(),
  rrEligibility: z.string().max(40).optional(),
  caste: z.string().max(40).nullish(),
  subCaste: z.string().max(80).nullish(),
  houseType: z.string().max(40).nullish(),
  occupation: z.string().max(120).nullish(),
  bplApl: z.string().max(20).nullish(),
  farmerCategory: z.string().max(60).nullish(),
  // PII (will be encrypted before persistence):
  annualIncome: z.union([z.string(), z.number()]).nullish(),
  rationCardNo: z.string().max(40).nullish(),
  doorNo: z.string().max(40).nullish(),
  bankIfsc: z.string().max(20).nullish(),
  bankAccountNo: z.string().max(40).nullish(),
  aadharNo: z.string().max(20).nullish(),
  voterIdNo: z.string().max(20).nullish(),
});

// GET — list with pagination/search/filter. STAFF only (middleware enforces).
// Officers are scoped to their assigned mandal. PII never returned in list.
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireSession();
    requireRole(ctx, 'ADMIN', 'OFFICER', 'VIEWER');

    const page = Math.max(1, parseInt(request.nextUrl.searchParams.get('page') || '1'));
    const pageSize = Math.min(200, Math.max(1, parseInt(request.nextUrl.searchParams.get('pageSize') || '20')));
    const search = (request.nextUrl.searchParams.get('search') || '').slice(0, 100);
    const mandalIdParam = request.nextUrl.searchParams.get('mandalId') || '';
    const rrEligibility = request.nextUrl.searchParams.get('rrEligibility') || '';

    const effectiveMandalId = ctx.role === 'OFFICER' ? ctx.mandalId : (mandalIdParam || null);

    const where: Record<string, unknown> = { deletedAt: null };
    if (search) {
      where.OR = [
        { pdfId: { contains: search } },
        { beneficiaryName: { contains: search } },
      ];
    }
    if (effectiveMandalId) where.village = { mandalId: effectiveMandalId };
    if (rrEligibility) where.rrEligibility = rrEligibility;

    const [families, total] = await Promise.all([
      db.family.findMany({
        where,
        select: {
          id: true,
          pdfId: true,
          beneficiaryName: true,
          gender: true,
          caste: true,
          subCaste: true,
          houseType: true,
          rrEligibility: true,
          occupation: true,
          bplApl: true,
          farmerCategory: true,
          villageId: true,
          village: {
            select: {
              id: true,
              name: true,
              mandal: { select: { id: true, name: true, code: true } },
            },
          },
          firstScheme: { select: { extentOfLandAcCts: true, totalCompensation: true } },
          plotAllotment: { select: { allotmentStatus: true } },
          _count: { select: { members: true } },
          createdAt: true,
        },
        orderBy: { pdfId: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.family.count({ where }),
    ]);

    const result = families.map((f) => ({
      id: f.id,
      pdfId: f.pdfId,
      beneficiaryName: f.beneficiaryName,
      gender: f.gender,
      caste: f.caste,
      subCaste: f.subCaste,
      houseType: f.houseType,
      rrEligibility: f.rrEligibility,
      occupation: f.occupation,
      bplApl: f.bplApl,
      farmerCategory: f.farmerCategory,
      landAcres: f.firstScheme?.extentOfLandAcCts || null,
      totalCompensation: f.firstScheme?.totalCompensation || null,
      hasFirstScheme: !!f.firstScheme,
      plotStatus: f.plotAllotment?.allotmentStatus || 'NOT_ALLOTTED',
      villageId: f.villageId,
      villageName: f.village.name,
      mandalName: f.village.mandal.name,
      memberCount: f._count.members,
      createdAt: f.createdAt,
      _piiAccess: 'none' as const,
    }));

    return NextResponse.json({ families: result, total, page, pageSize });
  } catch (err) {
    const r = toAuthErrorResponse(err);
    if (r) return r;
    console.error('Admin families GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch families' }, { status: 500 });
  }
}

// POST — create family. ADMIN only.
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireSession();
    requireRole(ctx, 'ADMIN');

    const ip = clientIp(request);
    const rl = rateLimit('admin-write', `${ctx.userId}:${ip}`, { max: 60, windowMs: 60_000 });
    if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: rl.headers });

    const parsed = FamilyCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.issues }, { status: 400 });
    }
    const body = parsed.data;

    const existing = await db.family.findUnique({ where: { pdfId: body.pdfId } });
    if (existing) {
      return NextResponse.json({ error: `Family with PDF ID ${body.pdfId} already exists` }, { status: 409 });
    }

    const village = await db.village.findUnique({ where: { id: body.villageId } });
    if (!village) {
      return NextResponse.json({ error: 'Village not found' }, { status: 404 });
    }

    const family = await db.family.create({
      data: {
        pdfId: body.pdfId,
        beneficiaryName: body.beneficiaryName,
        fathersName: body.fathersName ?? null,
        husbandName: body.husbandName ?? null,
        gender: body.gender ?? 'Male',
        villageId: body.villageId,
        rrEligibility: body.rrEligibility ?? 'Ineligible',
        caste: body.caste ?? null,
        subCaste: body.subCaste ?? null,
        houseType: body.houseType ?? null,
        occupation: body.occupation ?? null,
      },
      select: {
        id: true, pdfId: true, beneficiaryName: true, fathersName: true, husbandName: true,
        gender: true, caste: true, subCaste: true, houseType: true, rrEligibility: true,
        occupation: true, villageId: true,
        village: { select: { id: true, name: true, mandal: { select: { id: true, name: true } } } },
      },
    });

    await audit({
      ctx, action: 'FAMILY_CREATE', resourceType: 'FAMILY', resourceId: family.pdfId,
      ip, userAgent: request.headers.get('user-agent') ?? null,
    });

    return NextResponse.json({ family }, { status: 201 });
  } catch (err) {
    const r = toAuthErrorResponse(err);
    if (r) return r;
    console.error('Admin families POST error:', err);
    return NextResponse.json({ error: 'Failed to create family' }, { status: 500 });
  }
}

// PUT — update family. ADMIN only. Encrypts PII before write.
export async function PUT(request: NextRequest) {
  try {
    const ctx = await requireSession();
    requireRole(ctx, 'ADMIN');

    const ip = clientIp(request);
    const rl = rateLimit('admin-write', `${ctx.userId}:${ip}`, { max: 60, windowMs: 60_000 });
    if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: rl.headers });

    const parsed = FamilyUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.issues }, { status: 400 });
    }
    const u = parsed.data;

    const existing = await db.family.findUnique({ where: { pdfId: u.pdfId } });
    if (!existing) {
      return NextResponse.json({ error: `Family with PDF ID ${u.pdfId} not found` }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (u.beneficiaryName !== undefined) data.beneficiaryName = u.beneficiaryName;
    if (u.fathersName !== undefined) data.fathersName = u.fathersName ?? null;
    if (u.husbandName !== undefined) data.husbandName = u.husbandName ?? null;
    if (u.gender !== undefined) data.gender = u.gender;
    if (u.villageId !== undefined) {
      const village = await db.village.findUnique({ where: { id: u.villageId } });
      if (!village) return NextResponse.json({ error: 'Village not found' }, { status: 404 });
      data.villageId = u.villageId;
    }
    if (u.rrEligibility !== undefined) data.rrEligibility = u.rrEligibility;
    if (u.caste !== undefined) data.caste = u.caste ?? null;
    if (u.subCaste !== undefined) data.subCaste = u.subCaste ?? null;
    if (u.houseType !== undefined) data.houseType = u.houseType ?? null;
    if (u.occupation !== undefined) data.occupation = u.occupation ?? null;
    if (u.bplApl !== undefined) data.bplApl = u.bplApl ?? null;
    if (u.farmerCategory !== undefined) data.farmerCategory = u.farmerCategory ?? null;

    const piiTouched: string[] = [];
    if (u.annualIncome !== undefined) {
      data.annualIncomeEnc = u.annualIncome == null || u.annualIncome === '' ? null : encryptPII(String(u.annualIncome));
      piiTouched.push('annualIncome');
    }
    if (u.rationCardNo !== undefined) {
      data.rationCardNoEnc = u.rationCardNo ? encryptPII(u.rationCardNo) : null;
      piiTouched.push('rationCardNo');
    }
    if (u.doorNo !== undefined) {
      data.doorNoEnc = u.doorNo ? encryptPII(u.doorNo) : null;
      piiTouched.push('doorNo');
    }
    if (u.bankIfsc !== undefined) {
      data.bankIfscEnc = u.bankIfsc ? encryptPII(u.bankIfsc) : null;
      piiTouched.push('bankIfsc');
    }
    if (u.bankAccountNo !== undefined) {
      data.bankAccountNoEnc = u.bankAccountNo ? encryptPII(u.bankAccountNo) : null;
      piiTouched.push('bankAccountNo');
    }
    if (u.aadharNo !== undefined) {
      data.aadharNoEnc = u.aadharNo ? encryptPII(u.aadharNo) : null;
      data.aadharNoHash = hashPII(u.aadharNo ?? null);
      piiTouched.push('aadharNo');
    }
    if (u.voterIdNo !== undefined) {
      data.voterIdNoEnc = u.voterIdNo ? encryptPII(u.voterIdNo) : null;
      data.voterIdNoHash = hashPII(u.voterIdNo ?? null);
      piiTouched.push('voterIdNo');
    }

    const family = await db.family.update({
      where: { pdfId: u.pdfId },
      data,
      select: {
        id: true, pdfId: true, beneficiaryName: true, fathersName: true, husbandName: true,
        gender: true, caste: true, subCaste: true, houseType: true, rrEligibility: true,
        occupation: true, villageId: true,
        village: { select: { id: true, name: true, mandal: { select: { id: true, name: true } } } },
      },
    });

    await audit({
      ctx,
      action: piiTouched.length > 0 ? 'FAMILY_UPDATE_PII' : 'FAMILY_UPDATE',
      resourceType: 'FAMILY',
      resourceId: u.pdfId,
      ip,
      userAgent: request.headers.get('user-agent') ?? null,
      metadata: piiTouched.length > 0 ? { piiFields: piiTouched } : undefined,
    });

    return NextResponse.json({ family });
  } catch (err) {
    const r = toAuthErrorResponse(err);
    if (r) return r;
    console.error('Admin families PUT error:', err);
    return NextResponse.json({ error: 'Failed to update family' }, { status: 500 });
  }
}

// DELETE — SOFT delete. ADMIN only. Preserves data for audit/recovery.
export async function DELETE(request: NextRequest) {
  try {
    const ctx = await requireSession();
    requireRole(ctx, 'ADMIN');

    const body = await request.json();
    const pdfId: string | undefined = body?.pdfId;
    if (!pdfId) {
      return NextResponse.json({ error: 'pdfId is required' }, { status: 400 });
    }

    const existing = await db.family.findUnique({
      where: { pdfId },
      include: { _count: { select: { members: true, plotAllotment: true } } },
    });

    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: `Family with PDF ID ${pdfId} not found` }, { status: 404 });
    }

    await db.family.update({
      where: { pdfId },
      data: { deletedAt: new Date() },
    });

    await audit({
      ctx, action: 'FAMILY_SOFT_DELETE', resourceType: 'FAMILY', resourceId: pdfId,
      ip: clientIp(request), userAgent: request.headers.get('user-agent') ?? null,
      metadata: { memberCount: existing._count.members, hadPlotAllotment: !!existing._count.plotAllotment },
    });

    return NextResponse.json({
      success: true,
      message: `Family ${pdfId} archived (soft delete) successfully`,
      affectedMembers: existing._count.members,
      affectedPlot: existing._count.plotAllotment,
    });
  } catch (err) {
    const r = toAuthErrorResponse(err);
    if (r) return r;
    console.error('Admin families DELETE error:', err);
    return NextResponse.json({ error: 'Failed to delete family' }, { status: 500 });
  }
}
