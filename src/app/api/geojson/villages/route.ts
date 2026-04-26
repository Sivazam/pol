import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mandalId = searchParams.get('mandalId');

    // Build the query
    const where = mandalId ? { mandalId } : {};

    const villages = await db.village.findMany({
      where,
      include: {
        mandal: {
          select: { id: true, name: true, code: true, color: true },
        },
        families: {
          select: {
            rrEligibility: true,
            firstScheme: { select: { id: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Return point features with DB stats
    const pointFeatures = villages.map((village) => {
      const famCount = village.families.length;
      const rrBreakdown: Record<string, number> = {};
      let firstSchemeCount = 0;

      for (const family of village.families) {
        rrBreakdown[family.rrEligibility] = (rrBreakdown[family.rrEligibility] || 0) + 1;
        if (family.firstScheme) firstSchemeCount++;
      }

      const eligibleCount = rrBreakdown['Eligible'] || 0;
      const rrEligiblePct = famCount > 0 ? Math.round((eligibleCount / famCount) * 100) : 0;
      const firstSchemePct = famCount > 0 ? Math.round((firstSchemeCount / famCount) * 100) : 0;

      return {
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [village.longitude, village.latitude],
        },
        properties: {
          id: village.id,
          name: village.name,
          nameTelugu: village.nameTelugu,
          code: village.code,
          mandalCode: village.mandal.code,
          mandalName: village.mandal.name,
          mandalColor: village.mandal.color,
          familyCount: famCount,
          totalFamilies: village.totalFamilies,
          rrBreakdown,
          rrEligiblePct,
          firstSchemeCount,
          firstSchemePct,
        },
      };
    });

    return NextResponse.json({
      type: 'FeatureCollection',
      features: pointFeatures,
    });
  } catch (error) {
    console.error('GeoJSON villages API error:', error);
    return NextResponse.json({ error: 'Failed to fetch village GeoJSON' }, { status: 500 });
  }
}
