import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const member = await db.familyMember.findUnique({
      where: { id },
      include: {
        family: {
          select: {
            id: true, pdfNumber: true, headName: true, headNameTelugu: true,
            village: {
              select: { id: true, name: true, nameTelugu: true, mandal: { select: { name: true, nameTelugu: true } } },
            },
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found', code: 404 }, { status: 404 });
    }

    return NextResponse.json(member);
  } catch (error) {
    console.error('Member API error:', error);
    return NextResponse.json({ error: 'Failed to fetch member', code: 500 }, { status: 500 });
  }
}
