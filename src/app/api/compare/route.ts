import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const type = searchParams.get('type'); // 'mandal' or 'village'
    const idsParam = searchParams.get('ids'); // comma-separated ids

    if (!type || !idsParam) {
      return NextResponse.json(
        { error: 'Missing required params: type and ids' },
        { status: 400 }
      );
    }

    if (type !== 'mandal' && type !== 'village') {
      return NextResponse.json(
        { error: 'Type must be "mandal" or "village"' },
        { status: 400 }
      );
    }

    const ids = idsParam.split(',').filter(Boolean).slice(0, 3); // max 3

    if (ids.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 ids required for comparison' },
        { status: 400 }
      );
    }

    if (type === 'mandal') {
      const mandals = await db.mandal.findMany({
        where: { id: { in: ids } },
        include: {
          villages: { select: { id: true } },
        },
      });

      const results = await Promise.all(
        mandals.map(async (m) => {
          const villageIds = m.villages.map((v) => v.id);

          const [
            familyCount,
            firstSchemeCount,
            rrCounts,
            plotsAllotted,
            plotsPending,
            totalPlots,
          ] = await Promise.all([
            db.family.count({ where: { villageId: { in: villageIds } } }),
            db.firstScheme.count({
              where: { family: { villageId: { in: villageIds } } },
            }),
            db.family.groupBy({
              by: ['rrEligibility'],
              _count: true,
              where: { villageId: { in: villageIds } },
            }),
            db.plotAllotment.count({
              where: {
                allotmentStatus: { in: ['ALLOTTED', 'POSSESSION_GIVEN'] },
                family: { villageId: { in: villageIds } },
              },
            }),
            db.plotAllotment.count({
              where: {
                allotmentStatus: 'PENDING',
                family: { villageId: { in: villageIds } },
              },
            }),
            db.plotAllotment.count({
              where: { family: { villageId: { in: villageIds } } },
            }),
          ]);

          const rrBreakdown: Record<string, number> = {
            Eligible: 0,
            Ineligible: 0,
          };
          rrCounts.forEach((s) => {
            rrBreakdown[s.rrEligibility] = s._count;
          });

          return {
            id: m.id,
            name: m.name,
            nameTelugu: m.nameTelugu,
            code: m.code,
            color: m.color,
            familyCount,
            villageCount: villageIds.length,
            firstSchemeCount,
            rrBreakdown,
            plotsAllotted,
            plotsPending,
            totalPlots,
          };
        })
      );

      return NextResponse.json({ type: 'mandal', items: results });
    }

    // Village comparison
    const villages = await db.village.findMany({
      where: { id: { in: ids } },
      include: { mandal: { select: { name: true, code: true, color: true } } },
    });

    const results = await Promise.all(
      villages.map(async (v) => {
        const [
          familyCount,
          firstSchemeCount,
          memberCount,
          rrCounts,
          plotsAllotted,
          plotsPending,
        ] = await Promise.all([
          db.family.count({ where: { villageId: v.id } }),
          db.firstScheme.count({
            where: { family: { villageId: v.id } },
          }),
          db.familyMember.count({
            where: { family: { villageId: v.id } },
          }),
          db.family.groupBy({
            by: ['rrEligibility'],
            _count: true,
            where: { villageId: v.id },
          }),
          db.plotAllotment.count({
            where: {
              allotmentStatus: { in: ['ALLOTTED', 'POSSESSION_GIVEN'] },
              family: { villageId: v.id },
            },
          }),
          db.plotAllotment.count({
            where: {
              allotmentStatus: 'PENDING',
              family: { villageId: v.id },
            },
          }),
        ]);

        const rrBreakdown: Record<string, number> = {
          Eligible: 0,
          Ineligible: 0,
        };
        rrCounts.forEach((s) => {
          rrBreakdown[s.rrEligibility] = s._count;
        });

        return {
          id: v.id,
          name: v.name,
          nameTelugu: v.nameTelugu,
          code: v.code,
          mandalName: v.mandal.name,
          mandalCode: v.mandal.code,
          mandalColor: v.mandal.color,
          familyCount,
          firstSchemeCount,
          memberCount,
          rrBreakdown,
          plotsAllotted,
          plotsPending,
        };
      })
    );

    return NextResponse.json({ type: 'village', items: results });
  } catch (error) {
    console.error('Compare API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comparison data' },
      { status: 500 }
    );
  }
}
