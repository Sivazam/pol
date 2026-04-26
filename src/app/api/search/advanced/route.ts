import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

interface AdvancedSearchResult {
  id: string;
  type: 'family' | 'village' | 'mandal';
  name: string;
  subtitle: string;
  matchField: string;
  matchFieldLabel: string;
  relevance: number;
  path: string;
}

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q') || '';
    const typesParam = request.nextUrl.searchParams.get('types') || 'family,village,mandal';
    const fieldsParam = request.nextUrl.searchParams.get('fields') || '';
    const limitParam = request.nextUrl.searchParams.get('limit') || '20';
    const limit = Math.min(parseInt(limitParam, 10) || 20, 50);

    if (!q.trim() || q.trim().length < 2) {
      return NextResponse.json({
        results: { family: [], village: [], mandal: [] },
        counts: { family: 0, village: 0, mandal: 0 },
        total: 0,
        query: q.trim(),
      });
    }

    const query = q.trim();
    const requestedTypes = typesParam.split(',').map((t) => t.trim()).filter(Boolean);
    const results: Record<string, AdvancedSearchResult[]> = {
      family: [],
      village: [],
      mandal: [],
    };

    // ─── Search Mandals ────────────────────────────────────────────────
    if (requestedTypes.includes('mandal')) {
      const mandalWhere: any = {
        OR: [
          { name: { contains: query } },
          { nameTelugu: { contains: query } },
          { code: { contains: query } },
        ],
      };

      const mandals = await db.mandal.findMany({
        where: mandalWhere,
        take: limit,
      });

      for (const m of mandals) {
        const matchField = m.name.includes(query) ? 'name'
          : m.nameTelugu?.includes(query) ? 'nameTelugu'
          : m.code.includes(query) ? 'code'
          : 'name';

        const matchFieldLabel: Record<string, string> = {
          name: 'Mandal Name',
          nameTelugu: 'Telugu Name',
          code: 'Mandal Code',
        };

        results.mandal.push({
          id: m.id,
          type: 'mandal',
          name: m.name,
          subtitle: `Mandal • ${m.code}`,
          matchField,
          matchFieldLabel: matchFieldLabel[matchField] || matchField,
          relevance: matchField === 'code' ? 3 : matchField === 'name' ? 2 : 1,
          path: `mandal:${m.id}`,
        });
      }
    }

    // ─── Search Villages ───────────────────────────────────────────────
    if (requestedTypes.includes('village')) {
      const villageWhere: any = {
        OR: [
          { name: { contains: query } },
          { nameTelugu: { contains: query } },
          { code: { contains: query } },
        ],
      };

      const villages = await db.village.findMany({
        where: villageWhere,
        include: { mandal: { select: { name: true, code: true } } },
        take: limit,
      });

      for (const v of villages) {
        const matchField = v.name.includes(query) ? 'name'
          : v.nameTelugu?.includes(query) ? 'nameTelugu'
          : v.code.includes(query) ? 'code'
          : 'name';

        const matchFieldLabel: Record<string, string> = {
          name: 'Village Name',
          nameTelugu: 'Telugu Name',
          code: 'Village Code',
        };

        results.village.push({
          id: v.id,
          type: 'village',
          name: v.name,
          subtitle: `Village • ${v.mandal.name} Mandal`,
          matchField,
          matchFieldLabel: matchFieldLabel[matchField] || matchField,
          relevance: matchField === 'code' ? 3 : matchField === 'name' ? 2 : 1,
          path: `village:${v.id}`,
        });
      }
    }

    // ─── Search Families ───────────────────────────────────────────────
    if (requestedTypes.includes('family')) {
      const familyWhere: any = {
        deletedAt: null,
        OR: [
          { pdfId: { contains: query } },
          { beneficiaryName: { contains: query } },
        ],
      };

      // Apply field filter if specified
      if (fieldsParam) {
        const allowedFields = fieldsParam.split(',').map((f) => f.trim());
        const fieldMap: Record<string, string> = {
          pdfId: 'pdfId',
          beneficiaryName: 'beneficiaryName',
        };
        const activeFields = allowedFields
          .map((f) => fieldMap[f])
          .filter(Boolean);

        if (activeFields.length > 0) {
          familyWhere.OR = activeFields.map((field) => ({
            [field]: { contains: query },
          }));
        }
      }

      const families = await db.family.findMany({
        where: familyWhere,
        include: {
          village: { select: { name: true, mandal: { select: { name: true } } } },
        },
        take: limit,
      });

      for (const f of families) {
        const matchField = f.pdfId.includes(query) ? 'pdfId'
          : f.beneficiaryName.includes(query) ? 'beneficiaryName'
          : 'pdfId';

        const matchFieldLabel: Record<string, string> = {
          pdfId: 'PDF ID',
          beneficiaryName: 'Beneficiary Name',
        };

        results.family.push({
          id: f.id,
          type: 'family',
          name: `${f.pdfId} — ${f.beneficiaryName}`,
          subtitle: `Family • ${f.village.name}, ${f.village.mandal.name}`,
          matchField,
          matchFieldLabel: matchFieldLabel[matchField] || matchField,
          relevance: matchField === 'pdfId' ? 3 : matchField === 'beneficiaryName' ? 2 : 1,
          path: `family:${f.pdfId}:${f.id}`,
        });
      }
    }

    // Sort each type by relevance (descending)
    for (const type of Object.keys(results)) {
      results[type].sort((a, b) => b.relevance - a.relevance);
    }

    const counts = {
      family: results.family.length,
      village: results.village.length,
      mandal: results.mandal.length,
    };

    return NextResponse.json({
      results,
      counts,
      total: counts.family + counts.village + counts.mandal,
      query,
    });
  } catch (error) {
    console.error('Advanced search API error:', error);
    return NextResponse.json({
      results: { family: [], village: [], mandal: [] },
      counts: { family: 0, village: 0, mandal: 0 },
      total: 0,
      query: '',
    });
  }
}
