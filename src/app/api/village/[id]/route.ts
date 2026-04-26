import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch village with mandal info
    const village = await db.village.findUnique({
      where: { id },
      include: { mandal: { select: { id: true, name: true, nameTelugu: true, code: true, color: true } } },
    });

    if (!village) {
      return NextResponse.json({ error: 'Village not found' }, { status: 404 });
    }

    // ─── Family statistics ─────────────────────────────────────────────
    const familyCount = await db.family.count({ where: { villageId: id } });
    const firstSchemeCount = await db.firstScheme.count({
      where: { family: { villageId: id } },
    });

    const rrCounts = await db.family.groupBy({
      by: ['rrEligibility'],
      _count: true,
      where: { villageId: id },
    });

    const statusBreakdown: Record<string, number> = {};
    rrCounts.forEach((s) => { statusBreakdown[s.rrEligibility] = s._count; });

    // ─── Member demographics ───────────────────────────────────────────
    const members = await db.familyMember.findMany({
      where: { family: { villageId: id } },
      select: { age: true, gender: true },
    });

    const totalMembers = members.length;
    const maleCount = members.filter((m) => m.gender === 'Male').length;
    const femaleCount = members.filter((m) => m.gender === 'Female').length;
    const minorCount = members.filter((m) => m.age < 18).length;
    const adultCount = totalMembers - minorCount;

    // Family size distribution
    const familyMemberCounts = await db.family.findMany({
      where: { villageId: id },
      select: { _count: { select: { members: true } } },
    });
    const memberCounts = familyMemberCounts.map((f) => f._count.members);
    const avgFamilySize = memberCounts.length > 0
      ? (memberCounts.reduce((a, b) => a + b, 0) / memberCounts.length).toFixed(1)
      : '0';

    // Family size buckets
    const sizeBuckets: Record<string, number> = { '1-2': 0, '3-4': 0, '5-6': 0, '7+': 0 };
    memberCounts.forEach((c) => {
      if (c <= 2) sizeBuckets['1-2']++;
      else if (c <= 4) sizeBuckets['3-4']++;
      else if (c <= 6) sizeBuckets['5-6']++;
      else sizeBuckets['7+']++;
    });

    // ─── Land statistics (from FirstScheme) ─────────────────────────────
    const landFamilies = await db.firstScheme.findMany({
      where: { family: { villageId: id }, extentOfLandAcCts: { not: null } },
      select: { extentOfLandAcCts: true },
    });

    const landValues = landFamilies.map((f) => f.extentOfLandAcCts!).filter((l) => l > 0);
    const avgLand = landValues.length > 0
      ? (landValues.reduce((a, b) => a + b, 0) / landValues.length).toFixed(2)
      : '0';
    const minLand = landValues.length > 0 ? Math.min(...landValues).toFixed(2) : '0';
    const maxLand = landValues.length > 0 ? Math.max(...landValues).toFixed(2) : '0';

    // Land distribution ranges
    const landBuckets: Record<string, number> = { '0-1': 0, '1-3': 0, '3-5': 0, '5-10': 0, '10+': 0 };
    landValues.forEach((l) => {
      if (l <= 1) landBuckets['0-1']++;
      else if (l <= 3) landBuckets['1-3']++;
      else if (l <= 5) landBuckets['3-5']++;
      else if (l <= 10) landBuckets['5-10']++;
      else landBuckets['10+']++;
    });

    // ─── Top families by land holding (from FirstScheme) ────────────────
    const topFamilies = await db.family.findMany({
      where: { villageId: id, firstScheme: { extentOfLandAcCts: { not: null } } },
      select: {
        id: true,
        pdfId: true,
        beneficiaryName: true,
        rrEligibility: true,
        firstScheme: { select: { extentOfLandAcCts: true, totalCompensation: true } },
        _count: { select: { members: true } },
      },
      orderBy: { firstScheme: { extentOfLandAcCts: 'desc' } },
      take: 10,
    });

    // ─── Plot statistics ───────────────────────────────────────────────
    const totalPlots = await db.plotAllotment.count({
      where: { family: { villageId: id } },
    });
    const allottedPlots = await db.plotAllotment.count({
      where: { family: { villageId: id }, allotmentStatus: 'ALLOTTED' },
    });
    const possessionPlots = await db.plotAllotment.count({
      where: { family: { villageId: id }, allotmentStatus: 'POSSESSION_GIVEN' },
    });
    const plotAllotmentRate = totalPlots > 0
      ? (((allottedPlots + possessionPlots) / totalPlots) * 100).toFixed(1)
      : '0';

    // ─── Nearby villages (same mandal, excluding current) ──────────────
    const nearbyVillages = await db.village.findMany({
      where: {
        mandalId: village.mandalId,
        id: { not: id },
      },
      select: {
        id: true,
        name: true,
        nameTelugu: true,
        code: true,
        latitude: true,
        longitude: true,
        totalFamilies: true,
      },
      orderBy: { name: 'asc' },
      take: 5,
    });

    // Add first scheme count to nearby villages
    const nearbyWithStats = await Promise.all(nearbyVillages.map(async (nv) => {
      const firstScheme = await db.firstScheme.count({
        where: { family: { villageId: nv.id } },
      });
      return { ...nv, firstSchemeCount: firstScheme };
    }));

    return NextResponse.json({
      village: {
        id: village.id,
        name: village.name,
        nameTelugu: village.nameTelugu,
        code: village.code,
        latitude: village.latitude,
        longitude: village.longitude,
        mandalId: village.mandalId,
        mandal: village.mandal,
      },
      familyStats: {
        total: familyCount,
        firstSchemeCount,
        statusBreakdown,
        avgFamilySize,
      },
      memberDemographics: {
        total: totalMembers,
        maleCount,
        femaleCount,
        minorCount,
        adultCount,
        sizeBuckets,
      },
      landStats: {
        avgLand,
        minLand,
        maxLand,
        landBuckets,
        familiesWithLand: landValues.length,
        familiesWithoutLand: familyCount - landValues.length,
      },
      topFamilies: topFamilies.map((f) => ({
        id: f.id,
        pdfId: f.pdfId,
        beneficiaryName: f.beneficiaryName,
        rrEligibility: f.rrEligibility,
        landAcres: f.firstScheme?.extentOfLandAcCts || null,
        totalCompensation: f.firstScheme?.totalCompensation || null,
        memberCount: f._count.members,
      })),
      plotStats: {
        total: totalPlots,
        allotted: allottedPlots,
        possessionGiven: possessionPlots,
        allotmentRate: plotAllotmentRate,
      },
      nearbyVillages: nearbyWithStats,
    });
  } catch (error) {
    console.error('Village detail API error:', error);
    return NextResponse.json({ error: 'Failed to fetch village details' }, { status: 500 });
  }
}
