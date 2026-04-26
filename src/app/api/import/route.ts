import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireSession, requireRole, toAuthErrorResponse, audit } from '@/lib/server-auth';
import { rateLimit, clientIp } from '@/lib/rate-limit';

const MAX_IMPORT_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_IMPORT_ROWS = 5000;

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireSession();
    requireRole(ctx, 'ADMIN');

    const ip = clientIp(request);
    const rl = rateLimit('import', `${ctx.userId}:${ip}`, { max: 5, windowMs: 60_000 });
    if (!rl.ok) return NextResponse.json({ error: 'Too many imports — please wait' }, { status: 429, headers: rl.headers });

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json({ error: 'Only CSV files are supported' }, { status: 400 });
    }
    if (file.size > MAX_IMPORT_BYTES) {
      return NextResponse.json({ error: `File exceeds ${MAX_IMPORT_BYTES / (1024 * 1024)} MB limit` }, { status: 413 });
    }

    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file is empty or has no data rows' }, { status: 400 });
    }
    if (lines.length - 1 > MAX_IMPORT_ROWS) {
      return NextResponse.json({ error: `Row count exceeds limit of ${MAX_IMPORT_ROWS}` }, { status: 413 });
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));

    const requiredCols = ['pdfid', 'beneficiaryname', 'villagecode'];
    const missing = requiredCols.filter(c => !headers.includes(c));
    if (missing.length > 0) {
      return NextResponse.json({ error: `Missing required columns: ${missing.join(', ')}` }, { status: 400 });
    }

    const villages = await db.village.findMany({ select: { id: true, code: true, mandalId: true } });
    const villageMap = new Map(villages.map(v => [v.code, v]));

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

        const pdfId = row['pdfid'];
        const beneficiaryName = row['beneficiaryname'];
        const villageCode = row['villagecode'];

        if (!pdfId || !beneficiaryName || !villageCode) { skipped++; continue; }

        const existing = await db.family.findUnique({ where: { pdfId } });
        if (existing) { skipped++; continue; }

        const village = villageMap.get(villageCode);
        if (!village) {
          errors.push(`Row ${i + 1}: Village code "${villageCode}" not found`);
          skipped++;
          continue;
        }

        const rrEligibility = ['Eligible', 'Ineligible'].includes(row['rreligibility'])
          ? row['rreligibility'] : 'Ineligible';

        await db.family.create({
          data: {
            pdfId,
            beneficiaryName,
            villageId: village.id,
            rrEligibility,
            caste: row['caste'] || null,
            subCaste: row['subcaste'] || null,
            houseType: row['housetype'] || null,
            occupation: row['occupation'] || null,
          },
        });

        imported++;
      } catch (err) {
        errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        skipped++;
      }
    }

    await audit({
      ctx, action: 'BULK_IMPORT_CSV', resourceType: 'FAMILY', resourceId: file.name,
      ip, userAgent: request.headers.get('user-agent') ?? null,
      metadata: { fileName: file.name, fileSize: file.size, imported, skipped, errorCount: errors.length },
    });

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      errors: errors.slice(0, 10),
      total: lines.length - 1,
    });
  } catch (err) {
    const r = toAuthErrorResponse(err);
    if (r) return r;
    console.error('Import error:', err);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}

export async function GET() {
  // Template CSV is non-sensitive — public access OK.
  const template = `pdfId,beneficiaryName,villageCode,rrEligibility,caste,subCaste,houseType,occupation
PDF243253,Sample Name,VPR,Eligible,St,Koya,Thatched/పూరిళ్లు,Agriculture Labour
PDF243254,Another Name,CHT,Ineligible,Bc,Reddy,RCC,Farmer`;

  return new Response(template, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename=family_import_template.csv',
    },
  });
}
