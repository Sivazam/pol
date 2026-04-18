import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || '';
  if (q.length < 2) return NextResponse.json({ families: [] });

  const families = await db.family.findMany({
    where: {
      OR: [
        { pdfNumber: { contains: q } },
        { headName: { contains: q } },
        { headNameTelugu: { contains: q } },
      ],
    },
    select: {
      id: true,
      pdfNumber: true,
      headName: true,
      village: { select: { name: true } },
    },
    take: 10,
  });

  return NextResponse.json({
    families: families.map(f => ({
      pdfNumber: f.pdfNumber,
      headName: f.headName,
      villageName: f.village.name,
      familyId: f.id,
    })),
  });
}
