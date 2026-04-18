import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const mandalId = request.nextUrl.searchParams.get('mandalId');
    const all = request.nextUrl.searchParams.get('all') === 'true';

    // If no mandalId and not requesting all, return error
    if (!mandalId && !all) {
      return NextResponse.json({ error: 'mandalId or all=true is required', code: 400 }, { status: 400 });
    }

    const where: any = {};
    if (mandalId) {
      where.mandalId = mandalId;
    }

    const villages = await db.village.findMany({
      where,
      include: { mandal: { select: { name: true, nameTelugu: true, color: true, code: true } } },
      orderBy: { name: 'asc' },
    });

    const result = await Promise.all(villages.map(async (v) => {
      const [familyCount, firstSchemeCount] = await Promise.all([
        db.family.count({ where: { villageId: v.id } }),
        db.family.count({ where: { villageId: v.id, firstSchemeEligible: true } }),
      ]);

      const sesCounts = await db.family.groupBy({
        by: ['sesStatus'],
        _count: true,
        where: { villageId: v.id },
      });

      const statusBreakdown: Record<string, number> = {};
      sesCounts.forEach(s => { statusBreakdown[s.sesStatus] = s._count; });

      return {
        id: v.id, name: v.name, nameTelugu: v.nameTelugu, code: v.code,
        latitude: v.latitude, longitude: v.longitude, mandalId: v.mandalId,
        totalFamilies: familyCount, firstSchemeCount, statusBreakdown,
        mandal: v.mandal,
      };
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Villages API error:', error);
    return NextResponse.json({ error: 'Failed to fetch villages', code: 500 }, { status: 500 });
  }
}
