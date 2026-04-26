import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireSession, requireRole, toAuthErrorResponse, audit } from '@/lib/server-auth';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireSession();
    requireRole(ctx, 'ADMIN', 'OFFICER', 'VIEWER');

    const ip = clientIp(request);
    const rl = rateLimit('export', `${ctx.userId}:${ip}`, { max: 20, windowMs: 60_000 });
    if (!rl.ok) return NextResponse.json({ error: 'Too many exports — please wait' }, { status: 429, headers: rl.headers });

    const format = request.nextUrl.searchParams.get('format') || 'csv';
    const type = request.nextUrl.searchParams.get('type') || 'families';

    if (type === 'mandals') {
      const mandals = await db.mandal.findMany({
        include: { villages: { select: { id: true } } },
        orderBy: { name: 'asc' },
      });

      const data = await Promise.all(mandals.map(async (m) => {
        const villageIds = m.villages.map(v => v.id);
        const [familyCount, firstSchemeCount] = await Promise.all([
          db.family.count({ where: { villageId: { in: villageIds } } }),
          db.firstScheme.count({ where: { family: { villageId: { in: villageIds } } } }),
        ]);
        return {
          name: m.name,
          nameTelugu: m.nameTelugu,
          code: m.code,
          latitude: m.latitude,
          longitude: m.longitude,
          villageCount: m.villages.length,
          familyCount,
          firstSchemeCount,
        };
      }));

      if (format === 'json') {
        return NextResponse.json(data);
      }

      const headers = ['Name', 'Name (Telugu)', 'Code', 'Latitude', 'Longitude', 'Villages', 'Families', 'First Scheme'];
      const rows = data.map(m => [m.name, m.nameTelugu, m.code, m.latitude, m.longitude, m.villageCount, m.familyCount, m.firstSchemeCount]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="mandals-export.csv"',
        },
      });
    }

    if (type === 'villages') {
      const villages = await db.village.findMany({
        include: {
          mandal: { select: { name: true, code: true } },
          _count: { select: { families: true } },
        },
        orderBy: { name: 'asc' },
      });

      const data = villages.map(v => ({
        name: v.name,
        nameTelugu: v.nameTelugu,
        code: v.code,
        mandal: v.mandal.name,
        mandalCode: v.mandal.code,
        latitude: v.latitude,
        longitude: v.longitude,
        totalFamilies: v.totalFamilies,
        familyCount: v._count.families,
      }));

      if (format === 'json') {
        return NextResponse.json(data);
      }

      const headers = ['Name', 'Name (Telugu)', 'Code', 'Mandal', 'Mandal Code', 'Latitude', 'Longitude', 'Registered Families', 'Total Families'];
      const rows = data.map(v => [v.name, v.nameTelugu, v.code, v.mandal, v.mandalCode, v.latitude, v.longitude, v.familyCount, v.totalFamilies]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="villages-export.csv"',
        },
      });
    }

    // Default: families export
    const mandalIdParam = request.nextUrl.searchParams.get('mandalId');
    const rrEligibility = request.nextUrl.searchParams.get('rrEligibility');
    const limit = Math.min(10000, Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') || '1000')));

    // Officer scope: hard-pin to own mandal regardless of param.
    const effectiveMandalId = ctx.role === 'OFFICER' ? ctx.mandalId : mandalIdParam;

    const where: Record<string, unknown> = { deletedAt: null };
    if (effectiveMandalId) where.village = { mandalId: effectiveMandalId };
    if (rrEligibility) where.rrEligibility = rrEligibility;

    const families = await db.family.findMany({
      where,
      select: {
        pdfId: true,
        beneficiaryName: true,
        caste: true,
        subCaste: true,
        houseType: true,
        rrEligibility: true,
        village: {
          select: {
            name: true,
            mandal: { select: { name: true, code: true } },
          },
        },
        firstScheme: { select: { extentOfLandAcCts: true, totalCompensation: true } },
        plotAllotment: { select: { allotmentStatus: true, plotNumber: true, colonyName: true, areaSqYards: true } },
        _count: { select: { members: true } },
      },
      orderBy: { pdfId: 'asc' },
      take: limit,
    });

    const data = families.map(f => ({
      pdfId: f.pdfId,
      beneficiaryName: f.beneficiaryName,
      village: f.village.name,
      mandal: f.village.mandal.name,
      mandalCode: f.village.mandal.code,
      caste: f.caste || '',
      subCaste: f.subCaste || '',
      houseType: f.houseType || '',
      rrEligibility: f.rrEligibility,
      hasFirstScheme: !!f.firstScheme,
      landAcres: f.firstScheme?.extentOfLandAcCts || '',
      totalCompensation: f.firstScheme?.totalCompensation || '',
      memberCount: f._count.members,
      plotStatus: f.plotAllotment?.allotmentStatus || 'NOT_ALLOTTED',
      plotNumber: f.plotAllotment?.plotNumber || '',
      colonyName: f.plotAllotment?.colonyName || '',
      plotArea: f.plotAllotment?.areaSqYards || '',
    }));

    if (format === 'json') {
      return NextResponse.json(data);
    }

    const headers = ['PDF ID', 'Beneficiary Name', 'Village', 'Mandal', 'Mandal Code', 'Caste', 'Sub-Caste', 'House Type', 'R&R Eligibility', 'Has First Scheme', 'Land (Acres)', 'Total Compensation', 'Members', 'Plot Status', 'Plot Number', 'Colony', 'Plot Area (Sq Yards)'];
    const rows = data.map(f => [f.pdfId, `"${f.beneficiaryName}"`, f.village, f.mandal, f.mandalCode, f.caste, f.subCaste, f.houseType, f.rrEligibility, f.hasFirstScheme, f.landAcres, f.totalCompensation, f.memberCount, f.plotStatus, f.plotNumber, `"${f.colonyName}"`, f.plotArea]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    await audit({
      ctx, action: 'EXPORT_FAMILIES', resourceType: 'FAMILY', resourceId: 'bulk',
      ip, userAgent: request.headers.get('user-agent') ?? null,
      metadata: { format, count: data.length, scope: effectiveMandalId ?? 'all' },
    });

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="families-export.csv"',
      },
    });
  } catch (err) {
    const r = toAuthErrorResponse(err);
    if (r) return r;
    console.error('Export API error:', err);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}
