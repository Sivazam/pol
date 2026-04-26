import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

// Authoritative mandal boundary polygons sourced from OSM relations
// (Chintur 10137098, Kunavaram 10137099, Vararamachandrapuram 10137298) and stored in
// /public/geojson/mandals.geojson. Loaded once at module scope and cached.
type MandalPolygons = Record<string, number[][][]>;

let cachedMandalPolygons: MandalPolygons | null = null;

function loadMandalPolygons(): MandalPolygons {
  if (cachedMandalPolygons) return cachedMandalPolygons;
  try {
    const geojsonPath = join(process.cwd(), 'public', 'geojson', 'mandals.geojson');
    const raw = readFileSync(geojsonPath, 'utf-8');
    const fc = JSON.parse(raw) as {
      features: Array<{ properties: { code?: string; name?: string }; geometry: { type: string; coordinates: number[][][] | number[][][][] } }>;
    };
    const polygons: MandalPolygons = {};
    for (const feature of fc.features) {
      const code = feature.properties?.code;
      if (!code) continue;
      if (feature.geometry.type === 'Polygon') {
        polygons[code] = feature.geometry.coordinates as number[][][];
      } else if (feature.geometry.type === 'MultiPolygon') {
        // Use the first (largest) ring for the simplified single-polygon API contract
        polygons[code] = (feature.geometry.coordinates as number[][][][])[0];
      }
    }
    cachedMandalPolygons = polygons;
    return polygons;
  } catch (error) {
    console.error('[api/map] failed to load mandals.geojson', error);
    cachedMandalPolygons = {};
    return cachedMandalPolygons;
  }
}

export async function GET() {
  try {
    // Fetch all mandals with villages
    const mandals = await db.mandal.findMany({
      include: {
        villages: {
          include: {
            families: {
              select: {
                rrEligibility: true,
                firstScheme: { select: { id: true } },
                plotAllotment: { select: { allotmentStatus: true } },
              },
            },
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Build GeoJSON features
    const mandalFeatures: object[] = [];
    const villageFeatures: object[] = [];
    const mandalStats: object[] = [];

    const mandalPolygons = loadMandalPolygons();
    for (const mandal of mandals) {
      const polygon = mandalPolygons[mandal.code] || [[[mandal.longitude - 0.04, mandal.latitude - 0.03], [mandal.longitude + 0.04, mandal.latitude - 0.03], [mandal.longitude + 0.04, mandal.latitude + 0.03], [mandal.longitude - 0.04, mandal.latitude + 0.03], [mandal.longitude - 0.04, mandal.latitude - 0.03]]];

      // Aggregate mandal-level stats
      let totalFamilies = 0;
      const rrBreakdown: Record<string, number> = {};
      let firstSchemeCount = 0;
      const plotBreakdown: Record<string, number> = {};

      for (const village of mandal.villages) {
        const famCount = village.families.length;
        totalFamilies += famCount;

        const villageRr: Record<string, number> = {};
        let villageFirstScheme = 0;
        const villagePlot: Record<string, number> = {};

        for (const family of village.families) {
          // R&R Eligibility
          villageRr[family.rrEligibility] = (villageRr[family.rrEligibility] || 0) + 1;
          rrBreakdown[family.rrEligibility] = (rrBreakdown[family.rrEligibility] || 0) + 1;

          // First scheme
          if (family.firstScheme) {
            villageFirstScheme++;
            firstSchemeCount++;
          }

          // Plot allotment
          if (family.plotAllotment) {
            villagePlot[family.plotAllotment.allotmentStatus] = (villagePlot[family.plotAllotment.allotmentStatus] || 0) + 1;
            plotBreakdown[family.plotAllotment.allotmentStatus] = (plotBreakdown[family.plotAllotment.allotmentStatus] || 0) + 1;
          }
        }

        // Calculate R&R Eligible % 
        const eligibleCount = villageRr['Eligible'] || 0;
        const rrEligiblePct = famCount > 0 ? Math.round((eligibleCount / famCount) * 100) : 0;

        // Village point feature
        villageFeatures.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [village.longitude, village.latitude],
          },
          properties: {
            id: village.id,
            name: village.name,
            nameTelugu: village.nameTelugu,
            code: village.code,
            mandalCode: mandal.code,
            mandalName: mandal.name,
            mandalColor: mandal.color,
            familyCount: famCount,
            totalFamilies: village.totalFamilies,
            rrBreakdown: villageRr,
            rrEligiblePct,
            firstSchemeCount: villageFirstScheme,
            firstSchemePct: famCount > 0 ? Math.round((villageFirstScheme / famCount) * 100) : 0,
            plotBreakdown: villagePlot,
            plotAllottedPct: famCount > 0 ? Math.round(((villagePlot['ALLOTTED'] || 0) + (villagePlot['POSSESSION_GIVEN'] || 0)) / famCount * 100) : 0,
          },
        });
      }

      // Mandal polygon feature
      const mandalEligibleCount = rrBreakdown['Eligible'] || 0;
      const mandalRrEligiblePct = totalFamilies > 0 ? Math.round((mandalEligibleCount / totalFamilies) * 100) : 0;
      mandalFeatures.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: polygon,
        },
        properties: {
          id: mandal.id,
          name: mandal.name,
          nameTelugu: mandal.nameTelugu,
          code: mandal.code,
          color: mandal.color,
          familyCount: totalFamilies,
          villageCount: mandal.villages.length,
          rrBreakdown,
          rrEligiblePct: mandalRrEligiblePct,
          firstSchemeCount,
          firstSchemePct: totalFamilies > 0 ? Math.round((firstSchemeCount / totalFamilies) * 100) : 0,
          plotBreakdown,
        },
      });

      // Stats summary
      mandalStats.push({
        id: mandal.id,
        name: mandal.name,
        code: mandal.code,
        color: mandal.color,
        latitude: mandal.latitude,
        longitude: mandal.longitude,
        familyCount: totalFamilies,
        villageCount: mandal.villages.length,
        rrBreakdown,
        rrEligiblePct: mandalRrEligiblePct,
        firstSchemeCount,
        firstSchemePct: totalFamilies > 0 ? Math.round((firstSchemeCount / totalFamilies) * 100) : 0,
        plotBreakdown,
      });
    }

    // Dam marker - Polavaram Dam location
    const damFeature = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [81.69, 17.25],
      },
      properties: {
        name: 'Polavaram Dam',
        type: 'dam',
      },
    };

    return NextResponse.json({
      type: 'FeatureCollection',
      features: [...mandalFeatures, ...villageFeatures, damFeature],
      meta: {
        mandalStats,
        totalMandals: mandals.length,
        totalVillages: mandals.reduce((acc, m) => acc + m.villages.length, 0),
        center: [81.32, 17.63] as [number, number],
        zoom: 9.5,
      },
    });
  } catch (error) {
    console.error('Map API error:', error);
    return NextResponse.json({ error: 'Failed to fetch map data', code: 500 }, { status: 500 });
  }
}
