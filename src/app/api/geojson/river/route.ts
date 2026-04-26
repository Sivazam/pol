import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    // Read Godavari River line from /public/geojson/godavari.geojson
    const geojsonPath = join(process.cwd(), 'public', 'geojson', 'godavari.geojson');
    const geojsonRaw = readFileSync(geojsonPath, 'utf-8');
    const geojson = JSON.parse(geojsonRaw);

    // Return the river features directly from the GeoJSON file
    return NextResponse.json({
      type: 'FeatureCollection',
      features: geojson.features,
    });
  } catch (error) {
    console.error('GeoJSON river API error:', error);
    return NextResponse.json({ error: 'Failed to fetch river GeoJSON' }, { status: 500 });
  }
}
