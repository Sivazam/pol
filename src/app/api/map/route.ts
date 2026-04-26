import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// Mandal boundary polygons - non-overlapping, based on actual geographic locations
// Chintoor: northern mandal (81.30-81.45°E, 17.65-17.80°N)
// VR Puram: central mandal (81.23-81.37°E, 17.50-17.66°N)
// Kunavaram: southwestern mandal (81.15-81.26°E, 17.44-17.55°N)
const MANDAL_POLYGONS: Record<string, number[][][]> = {
  CHN: [
    [
      [81.310, 17.800], [81.330, 17.802], [81.350, 17.798], [81.370, 17.790],
      [81.390, 17.778], [81.410, 17.762], [81.425, 17.745], [81.438, 17.725],
      [81.445, 17.705], [81.448, 17.685], [81.445, 17.670], [81.435, 17.660],
      [81.420, 17.655], [81.400, 17.652], [81.380, 17.653], [81.360, 17.658],
      [81.340, 17.667], [81.325, 17.678], [81.312, 17.692], [81.305, 17.708],
      [81.300, 17.725], [81.298, 17.742], [81.300, 17.758], [81.305, 17.775],
      [81.310, 17.800],
    ],
  ],
  VRP: [
    [
      [81.250, 17.658], [81.268, 17.660], [81.285, 17.655], [81.305, 17.648],
      [81.325, 17.640], [81.340, 17.630], [81.355, 17.615], [81.365, 17.598],
      [81.370, 17.578], [81.368, 17.558], [81.360, 17.540], [81.348, 17.525],
      [81.332, 17.515], [81.315, 17.508], [81.298, 17.505], [81.280, 17.508],
      [81.265, 17.518], [81.252, 17.530], [81.242, 17.545], [81.235, 17.560],
      [81.232, 17.575], [81.235, 17.590], [81.240, 17.605], [81.245, 17.620],
      [81.248, 17.640], [81.250, 17.658],
    ],
  ],
  KUN: [
    [
      [81.155, 17.552], [81.172, 17.558], [81.190, 17.560], [81.208, 17.558],
      [81.225, 17.552], [81.238, 17.542], [81.248, 17.530], [81.255, 17.518],
      [81.260, 17.505], [81.262, 17.492], [81.258, 17.478], [81.250, 17.465],
      [81.240, 17.455], [81.228, 17.448], [81.215, 17.443], [81.200, 17.442],
      [81.185, 17.445], [81.172, 17.452], [81.162, 17.462], [81.155, 17.475],
      [81.150, 17.490], [81.148, 17.505], [81.150, 17.520], [81.152, 17.535],
      [81.155, 17.552],
    ],
  ],
};

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

    for (const mandal of mandals) {
      const polygon = MANDAL_POLYGONS[mandal.code] || [[[mandal.longitude - 0.04, mandal.latitude - 0.03], [mandal.longitude + 0.04, mandal.latitude - 0.03], [mandal.longitude + 0.04, mandal.latitude + 0.03], [mandal.longitude - 0.04, mandal.latitude + 0.03], [mandal.longitude - 0.04, mandal.latitude - 0.03]]];

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
