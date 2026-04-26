/**
 * Snap every village to a point inside its real OSM mandal polygon.
 *
 *  - reads public/geojson/mandals.geojson  (authoritative boundaries)
 *  - reads village list from DB
 *  - for any village whose (lng, lat) falls outside the mandal polygon,
 *    deterministically picks a point inside the polygon based on a hash
 *    of the village code. Already-inside villages are left untouched.
 *  - writes the corrected coordinates back to DB.
 *
 * Usage:  bun scripts/fix-village-coords.ts
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';

interface Feature {
  properties: { code: string };
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] };
}

type Ring = number[][];

const db = new PrismaClient({ log: ['error'] });

function loadRings(): Record<string, Ring> {
  const path = join(process.cwd(), 'public', 'geojson', 'mandals.geojson');
  const fc = JSON.parse(readFileSync(path, 'utf-8')) as { features: Feature[] };
  const out: Record<string, Ring> = {};
  for (const f of fc.features) {
    const coords =
      f.geometry.type === 'Polygon'
        ? (f.geometry.coordinates as number[][][])[0]
        : (f.geometry.coordinates as number[][][][])[0][0];
    out[f.properties.code] = coords;
  }
  return out;
}

function pointInRing(pt: [number, number], ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > pt[1] !== yj > pt[1] &&
      pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function bbox(ring: Ring): [number, number, number, number] {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministically pick an inside point for a village using its code. */
function pickInsidePoint(ring: Ring, code: string): [number, number] {
  const [minX, minY, maxX, maxY] = bbox(ring);
  const seed = hash(code);
  // Try a small jittered grid until we hit interior. With a sane polygon
  // we typically succeed within a few tries.
  for (let attempt = 0; attempt < 80; attempt++) {
    const r1 = ((seed * (attempt + 1) * 1103515245 + 12345) >>> 0) / 0xffffffff;
    const r2 = ((seed * (attempt + 7) * 1664525 + 1013904223) >>> 0) / 0xffffffff;
    // Bias inward to avoid hugging the boundary.
    const fx = 0.10 + 0.80 * r1;
    const fy = 0.10 + 0.80 * r2;
    const x = minX + fx * (maxX - minX);
    const y = minY + fy * (maxY - minY);
    if (pointInRing([x, y], ring)) return [x, y];
  }
  // Fallback: centroid of bbox (very unlikely needed).
  return [(minX + maxX) / 2, (minY + maxY) / 2];
}

async function main() {
  const rings = loadRings();
  const mandals = await db.mandal.findMany({ select: { id: true, code: true } });
  const mandalCodeById = new Map(mandals.map((m) => [m.id, m.code]));

  const villages = await db.village.findMany({
    select: { id: true, code: true, name: true, latitude: true, longitude: true, mandalId: true },
  });

  let moved = 0;
  let kept = 0;
  for (const v of villages) {
    const mandalCode = mandalCodeById.get(v.mandalId);
    if (!mandalCode) continue;
    const ring = rings[mandalCode];
    if (!ring) continue;

    if (pointInRing([v.longitude, v.latitude], ring)) {
      kept++;
      continue;
    }

    const [lng, lat] = pickInsidePoint(ring, `${mandalCode}:${v.code}`);
    await db.village.update({
      where: { id: v.id },
      data: { longitude: lng, latitude: lat },
    });
    moved++;
    console.log(`  moved ${mandalCode} · ${v.code.padEnd(4)} ${v.name.padEnd(22)}  →  ${lng.toFixed(4)}, ${lat.toFixed(4)}`);
  }

  console.log(`\nDone. moved=${moved}  kept=${kept}  total=${villages.length}`);
  await db.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await db.$disconnect();
  process.exit(1);
});
