import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const [totalFamilies, totalMembers, eligibilityCounts, plotCounts, mandals] = await Promise.all([
      db.family.count(),
      db.familyMember.count(),
      db.family.groupBy({ by: ['rrEligibility'], _count: true }),
      db.plotAllotment.groupBy({ by: ['allotmentStatus'], _count: true }),
      db.mandal.findMany({ include: { villages: { select: { id: true } } } }),
    ]);

    const eligibilityMap: Record<string, number> = {};
    eligibilityCounts.forEach(s => { eligibilityMap[s.rrEligibility] = s._count; });

    const plotMap: Record<string, number> = {};
    plotCounts.forEach(p => { plotMap[p.allotmentStatus] = p._count; });

    // First Scheme count = families with FirstScheme records
    const firstSchemeCount = await db.firstScheme.count();

    const mandalStats = await Promise.all(mandals.map(async (m) => {
      const villageIds = m.villages.map(v => v.id);
      const [fCount, fsCount] = await Promise.all([
        db.family.count({ where: { villageId: { in: villageIds } } }),
        db.firstScheme.count({ where: { family: { villageId: { in: villageIds } } } }),
      ]);
      return {
        id: m.id, name: m.name, nameTelugu: m.nameTelugu, code: m.code,
        latitude: m.latitude, longitude: m.longitude, color: m.color,
        familyCount: fCount, villageCount: m.villages.length, firstSchemeCount: fsCount,
      };
    }));

    return NextResponse.json({
      totalFamilies,
      totalMembers,
      firstSchemeCount,
      eligible: eligibilityMap['Eligible'] || 0,
      ineligible: eligibilityMap['Ineligible'] || 0,
      plotsAllotted: plotMap['ALLOTTED'] || 0,
      plotsPending: plotMap['PENDING'] || 0,
      plotsPossessionGiven: plotMap['POSSESSION_GIVEN'] || 0,
      mandals: mandalStats,
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats', code: 500 }, { status: 500 });
  }
}
