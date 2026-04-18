import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const villageId = request.nextUrl.searchParams.get('villageId');
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');
    const search = request.nextUrl.searchParams.get('search') || '';
    const sesStatus = request.nextUrl.searchParams.get('sesStatus') || '';

    if (!villageId) {
      return NextResponse.json({ error: 'villageId is required', code: 400 }, { status: 400 });
    }

    const where: any = { villageId };
    if (search) {
      where.OR = [
        { pdfNumber: { contains: search } },
        { headName: { contains: search } },
      ];
    }
    if (sesStatus) {
      where.sesStatus = sesStatus;
    }

    const [families, total] = await Promise.all([
      db.family.findMany({
        where,
        select: {
          id: true, pdfNumber: true, headName: true, headNameTelugu: true,
          caste: true, landAcres: true, houseType: true, sesStatus: true,
          firstSchemeEligible: true,
          _count: { select: { members: true } },
        },
        orderBy: { pdfNumber: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.family.count({ where }),
    ]);

    const result = families.map(f => ({
      ...f,
      memberCount: f._count.members,
      _count: undefined,
    }));

    return NextResponse.json({
      families: result,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Families API error:', error);
    return NextResponse.json({ error: 'Failed to fetch families', code: 500 }, { status: 500 });
  }
}
