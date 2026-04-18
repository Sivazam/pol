import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const [totalFamilies, totalMembers, firstSchemeEligible, statusCounts, plotCounts, mandals] = await Promise.all([
      db.family.count(),
      db.familyMember.count(),
      db.family.count({ where: { firstSchemeEligible: true } }),
      db.family.groupBy({ by: ['sesStatus'], _count: true }),
      db.newPlot.groupBy({ by: ['allotmentStatus'], _count: true }),
      db.mandal.findMany({ include: { villages: { select: { id: true } } } }),
    ]);

    const statusMap: Record<string, number> = {};
    statusCounts.forEach(s => { statusMap[s.sesStatus] = s._count; });

    const plotMap: Record<string, number> = {};
    plotCounts.forEach(p => { plotMap[p.allotmentStatus] = p._count; });

    const mandalStats = await Promise.all(mandals.map(async (m) => {
      const villageIds = m.villages.map(v => v.id);
      const [fCount, fsCount] = await Promise.all([
        db.family.count({ where: { villageId: { in: villageIds } } }),
        db.family.count({ where: { villageId: { in: villageIds }, firstSchemeEligible: true } }),
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
      firstSchemeEligible,
      surveyed: statusMap['SURVEYED'] || 0,
      verified: statusMap['VERIFIED'] || 0,
      approved: statusMap['APPROVED'] || 0,
      rejected: statusMap['REJECTED'] || 0,
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
