import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    // Read mandal boundary polygons from /public/geojson/mandals.geojson
    const geojsonPath = join(process.cwd(), 'public', 'geojson', 'mandals.geojson');
    const geojsonRaw = readFileSync(geojsonPath, 'utf-8');
    const geojson = JSON.parse(geojsonRaw);

    // Fetch DB stats per mandal
    const mandals = await db.mandal.findMany({
      include: {
        villages: {
          include: {
            families: {
              select: {
                rrEligibility: true,
                firstScheme: { select: { id: true } },
              },
            },
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Create a lookup map from mandal code to DB stats
    const statsByCode: Record<string, {
      id: string;
      name: string;
      nameTelugu: string;
      familyCount: number;
      villageCount: number;
      rrBreakdown: Record<string, number>;
      firstSchemeCount: number;
      firstSchemePct: number;
      rrEligiblePct: number;
    }> = {};

    for (const mandal of mandals) {
      let totalFamilies = 0;
      const rrBreakdown: Record<string, number> = {};
      let firstSchemeCount = 0;

      for (const village of mandal.villages) {
        for (const family of village.families) {
          totalFamilies++;
          rrBreakdown[family.rrEligibility] = (rrBreakdown[family.rrEligibility] || 0) + 1;
          if (family.firstScheme) firstSchemeCount++;
        }
      }

      statsByCode[mandal.code] = {
        id: mandal.id,
        name: mandal.name,
        nameTelugu: mandal.nameTelugu,
        familyCount: totalFamilies,
        villageCount: mandal.villages.length,
        rrBreakdown,
        firstSchemeCount,
        firstSchemePct: totalFamilies > 0 ? Math.round((firstSchemeCount / totalFamilies) * 100) : 0,
        rrEligiblePct: totalFamilies > 0
          ? Math.round((rrBreakdown['Eligible'] || 0) / totalFamilies * 100)
          : 0,
      };
    }

    // Merge GeoJSON features with DB stats
    const features = geojson.features.map((feature: { properties: Record<string, unknown>; geometry: Record<string, unknown> }) => {
      const code = feature.properties.code as string;
      const stats = statsByCode[code];

      return {
        type: 'Feature' as const,
        geometry: feature.geometry,
        properties: {
          ...feature.properties,
          id: stats?.id || null,
          name: stats?.name || feature.properties.name,
          nameTelugu: stats?.nameTelugu || feature.properties.nameTelugu,
          familyCount: stats?.familyCount || 0,
          villageCount: stats?.villageCount || 0,
          rrBreakdown: stats?.rrBreakdown || {},
          firstSchemeCount: stats?.firstSchemeCount || 0,
          firstSchemePct: stats?.firstSchemePct || 0,
          rrEligiblePct: stats?.rrEligiblePct || 0,
        },
      };
    });

    return NextResponse.json({
      type: 'FeatureCollection',
      features,
    });
  } catch (error) {
    console.error('GeoJSON mandals API error:', error);
    return NextResponse.json({ error: 'Failed to fetch mandal GeoJSON' }, { status: 500 });
  }
}
