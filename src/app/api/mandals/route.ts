import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const mandals = await db.mandal.findMany({
      include: {
        villages: {
          select: { id: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const result = await Promise.all(mandals.map(async (m) => {
      const villageIds = m.villages.map(v => v.id);
      const [familyCount, firstSchemeCount] = await Promise.all([
        db.family.count({ where: { villageId: { in: villageIds } } }),
        db.family.count({ where: { villageId: { in: villageIds }, firstSchemeEligible: true } }),
      ]);

      const sesCounts = await db.family.groupBy({
        by: ['sesStatus'],
        _count: true,
        where: { villageId: { in: villageIds } },
      });

      const statusBreakdown: Record<string, number> = {};
      sesCounts.forEach(s => { statusBreakdown[s.sesStatus] = s._count; });

      return {
        id: m.id, name: m.name, nameTelugu: m.nameTelugu, code: m.code,
        latitude: m.latitude, longitude: m.longitude, color: m.color,
        familyCount, villageCount: villageIds.length, firstSchemeCount, statusBreakdown,
      };
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Mandals API error:', error);
    return NextResponse.json({ error: 'Failed to fetch mandals', code: 500 }, { status: 500 });
  }
}
