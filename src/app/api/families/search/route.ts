import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || '';
  if (q.length < 2) return NextResponse.json({ families: [] });

  const families = await db.family.findMany({
    where: {
      OR: [
        { pdfId: { contains: q } },
        { beneficiaryName: { contains: q } },
      ],
    },
    select: {
      id: true,
      pdfId: true,
      beneficiaryName: true,
      village: { select: { name: true } },
    },
    take: 10,
  });

  return NextResponse.json({
    families: families.map(f => ({
      pdfId: f.pdfId,
      beneficiaryName: f.beneficiaryName,
      villageName: f.village.name,
      familyId: f.id,
    })),
  });
}
