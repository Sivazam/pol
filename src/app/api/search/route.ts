import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q') || '';
    if (!q.trim() || q.trim().length < 2) {
      return NextResponse.json({ results: [] });
    }

    const query = q.trim();
    const results: Array<{
      type: string;
      id: string;
      title: string;
      subtitle: string;
      path: string;
    }> = [];

    // Search mandals
    const mandals = await db.mandal.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { nameTelugu: { contains: query } },
          { code: { contains: query } },
        ],
      },
      take: 5,
    });

    for (const m of mandals) {
      results.push({
        type: 'mandal',
        id: m.id,
        title: m.name,
        subtitle: `Mandal • ${m.code}`,
        path: `mandal:${m.id}`,
      });
    }

    // Search villages
    const villages = await db.village.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { nameTelugu: { contains: query } },
          { code: { contains: query } },
        ],
      },
      include: { mandal: { select: { name: true } } },
      take: 5,
    });

    for (const v of villages) {
      results.push({
        type: 'village',
        id: v.id,
        title: v.name,
        subtitle: `Village • ${v.mandal.name} Mandal`,
        path: `village:${v.id}`,
      });
    }

    // Search families by PDF ID or beneficiary name
    const families = await db.family.findMany({
      where: {
        OR: [
          { pdfId: { contains: query } },
          { beneficiaryName: { contains: query } },
        ],
      },
      include: {
        village: { select: { name: true, mandal: { select: { name: true } } } },
      },
      take: 10,
    });

    for (const f of families) {
      results.push({
        type: 'family',
        id: f.id,
        title: `${f.pdfId} — ${f.beneficiaryName}`,
        subtitle: `Family • ${f.village.name}, ${f.village.mandal.name}`,
        path: `family:${f.pdfId}:${f.id}`,
      });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ results: [] });
  }
}
