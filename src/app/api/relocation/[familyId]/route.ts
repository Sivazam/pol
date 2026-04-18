import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ familyId: string }> }) {
  try {
    const { familyId } = await params;

    const [family, newPlot] = await Promise.all([
      db.family.findUnique({
        where: { id: familyId },
        include: {
          village: {
            select: { id: true, name: true, nameTelugu: true, latitude: true, longitude: true },
          },
        },
      }),
      db.newPlot.findUnique({
        where: { familyId },
      }),
    ]);

    if (!family) {
      return NextResponse.json({ error: 'Family not found', code: 404 }, { status: 404 });
    }

    return NextResponse.json({
      family: {
        id: family.id,
        pdfNumber: family.pdfNumber,
        headName: family.headName,
        headNameTelugu: family.headNameTelugu,
        village: family.village,
      },
      newPlot,
      originalLocation: {
        latitude: family.village.latitude,
        longitude: family.village.longitude,
        name: family.village.name,
        nameTelugu: family.village.nameTelugu,
      },
    });
  } catch (error) {
    console.error('Relocation API error:', error);
    return NextResponse.json({ error: 'Failed to fetch relocation data', code: 500 }, { status: 500 });
  }
}
