import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const villageId = request.nextUrl.searchParams.get('villageId');
    const mandalId = request.nextUrl.searchParams.get('mandalId');
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');
    const search = request.nextUrl.searchParams.get('search') || '';
    const rrEligibility = request.nextUrl.searchParams.get('rrEligibility') || '';
    const sortBy = request.nextUrl.searchParams.get('sortBy') || 'pdfId';
    const sortDir = request.nextUrl.searchParams.get('sortDir') || 'asc';
    const all = request.nextUrl.searchParams.get('all') === 'true';

    // Build where clause
    const where: any = {};

    if (villageId) {
      where.villageId = villageId;
    } else if (mandalId) {
      where.village = { mandalId };
    }

    if (!villageId && !mandalId && !all) {
      return NextResponse.json({ error: 'villageId, mandalId, or all=true is required', code: 400 }, { status: 400 });
    }

    if (search) {
      where.OR = [
        { pdfId: { contains: search } },
        { beneficiaryName: { contains: search } },
      ];
    }
    if (rrEligibility) {
      where.rrEligibility = rrEligibility;
    }

    // Determine sort order
    const sortDirection = sortDir === 'desc' ? 'desc' : 'asc';
    let orderBy: any = { pdfId: sortDirection };
    if (sortBy === 'beneficiaryName') {
      orderBy = { beneficiaryName: sortDirection };
    } else if (sortBy === 'rrEligibility') {
      orderBy = { rrEligibility: sortDirection };
    } else if (sortBy === 'memberCount') {
      orderBy = { members: { _count: sortDirection } };
    }

    const [families, total] = await Promise.all([
      db.family.findMany({
        where,
        select: {
          id: true, pdfId: true, beneficiaryName: true, gender: true,
          caste: true, subCaste: true, houseType: true, rrEligibility: true,
          occupation: true, bplApl: true, farmerCategory: true,
          village: {
            select: {
              id: true, name: true,
              mandal: { select: { id: true, name: true, code: true, color: true } },
            },
          },
          firstScheme: { select: { totalCompensation: true, extentOfLandAcCts: true } },
          plotAllotment: { select: { allotmentStatus: true } },
          _count: { select: { members: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.family.count({ where }),
    ]);

    const result = families.map(f => ({
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
      hasFirstScheme: !!f.firstScheme,
      totalCompensation: f.firstScheme?.totalCompensation || null,
      landAcres: f.firstScheme?.extentOfLandAcCts || null,
      memberCount: f._count.members,
      villageName: f.village.name,
      mandalName: f.village.mandal.name,
      mandalCode: f.village.mandal.code,
      mandalColor: f.village.mandal.color,
      plotStatus: f.plotAllotment?.allotmentStatus || 'NOT_ALLOTTED',
    }));

    return NextResponse.json({
      families: result,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Families API error:', error);
    return NextResponse.json({ error: 'Failed to fetch families', code: 500 }, { status: 500 });
  }
}
