import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const villageId = request.nextUrl.searchParams.get('villageId');
    const mandalId = request.nextUrl.searchParams.get('mandalId');
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');
    const search = request.nextUrl.searchParams.get('search') || '';
    const sesStatus = request.nextUrl.searchParams.get('sesStatus') || '';
    const sortBy = request.nextUrl.searchParams.get('sortBy') || 'pdfNumber';
    const sortDir = request.nextUrl.searchParams.get('sortDir') || 'asc';
    const all = request.nextUrl.searchParams.get('all') === 'true';

    // Build where clause
    const where: any = {};

    if (villageId) {
      where.villageId = villageId;
    } else if (mandalId) {
      // Filter families by mandal through their village
      where.village = { mandalId };
    }

    if (!villageId && !mandalId && !all) {
      return NextResponse.json({ error: 'villageId, mandalId, or all=true is required', code: 400 }, { status: 400 });
    }

    if (search) {
      where.OR = [
        { pdfNumber: { contains: search } },
        { headName: { contains: search } },
      ];
    }
    if (sesStatus) {
      where.sesStatus = sesStatus;
    }

    // Determine sort order
    const sortDirection = sortDir === 'desc' ? 'desc' : 'asc';
    let orderBy: any = { pdfNumber: sortDirection };
    if (sortBy === 'headName') {
      orderBy = { headName: sortDirection };
    } else if (sortBy === 'sesStatus') {
      orderBy = { sesStatus: sortDirection };
    } else if (sortBy === 'landAcres') {
      orderBy = { landAcres: sortDirection };
    } else if (sortBy === 'memberCount') {
      orderBy = { members: { _count: sortDirection } };
    }

    const [families, total] = await Promise.all([
      db.family.findMany({
        where,
        select: {
          id: true, pdfNumber: true, headName: true, headNameTelugu: true,
          caste: true, landAcres: true, houseType: true, sesStatus: true,
          firstSchemeEligible: true,
          village: {
            select: {
              id: true, name: true,
              mandal: { select: { id: true, name: true, code: true, color: true } },
            },
          },
          newPlot: { select: { allotmentStatus: true } },
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
      pdfNumber: f.pdfNumber,
      headName: f.headName,
      headNameTelugu: f.headNameTelugu,
      caste: f.caste,
      landAcres: f.landAcres,
      houseType: f.houseType,
      sesStatus: f.sesStatus,
      firstSchemeEligible: f.firstSchemeEligible,
      memberCount: f._count.members,
      villageName: f.village.name,
      mandalName: f.village.mandal.name,
      mandalCode: f.village.mandal.code,
      mandalColor: f.village.mandal.color,
      plotStatus: f.newPlot?.allotmentStatus || 'NOT_ALLOTTED',
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
