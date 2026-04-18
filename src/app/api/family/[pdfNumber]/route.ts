import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ pdfNumber: string }> }) {
  try {
    const { pdfNumber } = await params;
    const family = await db.family.findUnique({
      where: { pdfNumber },
      include: {
        village: {
          include: {
            mandal: { select: { id: true, name: true, nameTelugu: true, code: true, color: true } },
          },
        },
        members: { orderBy: [{ relation: 'asc' }, { age: 'desc' }] },
        newPlot: true,
      },
    });

    if (!family) {
      return NextResponse.json({ error: 'Family not found', code: 404 }, { status: 404 });
    }

    return NextResponse.json(family);
  } catch (error) {
    console.error('Family API error:', error);
    return NextResponse.json({ error: 'Failed to fetch family', code: 500 }, { status: 500 });
  }
}
