import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionContext, toAuthErrorResponse, audit } from '@/lib/server-auth';
import { canSeeFullPII } from '@/lib/roles';
import { decryptPII } from '@/lib/crypto';
import { maskAadhar } from '@/lib/pii';
import { clientIp } from '@/lib/rate-limit';

function safeDecryptOrNull(blob: string | null | undefined): string | null {
  if (!blob) return null;
  try { return decryptPII(blob); } catch { return null; }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pdfId: string }> }
) {
  try {
    const ctx = await getSessionContext();
    const { pdfId } = await params;
    const family = await db.family.findFirst({
      where: { pdfId, deletedAt: null },
      include: {
        village: {
          include: {
            mandal: { select: { id: true, name: true, nameTelugu: true, code: true, color: true } },
          },
        },
        members: { orderBy: [{ relation: 'asc' }, { age: 'desc' }] },
        firstScheme: true,
        plotAllotment: true,
      },
    });

    if (!family) {
      return NextResponse.json({ error: 'Family not found' }, { status: 404 });
    }

    const targetMandalId = family.village?.mandal?.id ?? null;
    if (ctx.role === 'OFFICER' && targetMandalId && ctx.mandalId !== targetMandalId) {
      return NextResponse.json({ error: 'Forbidden — outside assigned mandal', code: 403 }, { status: 403 });
    }
    const showFullPII = canSeeFullPII(ctx, targetMandalId);
    if (ctx.role !== 'PUBLIC') {
      await audit({
        ctx,
        action: showFullPII ? 'FAMILY_PDF_FULL_PII' : 'FAMILY_PDF_MASKED',
        resourceType: 'FAMILY',
        resourceId: pdfId,
        ip: clientIp(request),
        userAgent: request.headers.get('user-agent') ?? null,
      });
    }

    const rrLabel = family.rrEligibility === 'Eligible' ? 'Eligible' : 'Ineligible';
    const rrCssClass = family.rrEligibility === 'Eligible' ? 'status-eligible' : 'status-ineligible';

    const allotLabel = (() => {
      switch (family.plotAllotment?.allotmentStatus) {
        case 'PENDING': return 'Pending';
        case 'ALLOTTED': return 'Allotted';
        case 'POSSESSION_GIVEN': return 'Possession Given';
        default: return 'Not Allotted';
      }
    })();

    // Compute timeline position based on R&R process
    const hasFirstScheme = !!family.firstScheme;
    const hasPlot = !!family.plotAllotment && family.plotAllotment.allotmentStatus !== 'PENDING';
    const timelinePos = family.rrEligibility === 'Eligible'
      ? (hasPlot ? 3 : hasFirstScheme ? 2 : 1)
      : 0;

    // Compute timeline dates
    const created = new Date(family.createdAt);
    const fmtDate = (d: Date) => d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    const offsets = [0, 2, 4, 6];

    const timelineSteps = [
      { key: 'ASSESSED', label: 'Assessed' },
      { key: 'ELIGIBLE', label: 'R&R Eligible' },
      { key: 'SCHEME', label: 'First Scheme' },
      { key: 'RELOCATED', label: 'Relocated' },
    ].map((step, i) => {
      const d = new Date(created);
      d.setMonth(d.getMonth() + offsets[i]);
      return { ...step, date: i <= timelinePos ? fmtDate(d) : '—' };
    });

    const landAcres = family.firstScheme?.extentOfLandAcCts || null;
    const totalCompensation = family.firstScheme?.totalCompensation || null;
    const minorCount = family.members.filter(m => m.age < 18).length;

    // Compensation breakdown for First Scheme
    const fs = family.firstScheme;
    const compensationItems = fs ? [
      { label: 'Subsistence Allowance', value: fs.subsistenceAllowance },
      { label: 'SC/ST Additional Allowance', value: fs.scStAdditionalAllowance },
      { label: 'Transport Charges', value: fs.transportCharges },
      { label: 'Cattle Shed / Petty Shop', value: fs.cattleShedPettyShop ? `₹${fs.cattleShedPettyShop}` : null },
      { label: 'Artisan / Small Trader Grant', value: fs.artisanSmallTraderGrant },
      { label: 'One-Time Resettlement Allowance', value: fs.oneTimeResettlementAllowance },
      { label: 'Structure Value', value: fs.structureValue },
      { label: 'Total Compensation', value: fs.totalCompensation },
    ].filter(item => item.value != null) : [];

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Family Report - ${family.pdfId}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 12mm;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #1a1a2e;
      font-size: 11pt;
      line-height: 1.5;
      background: white;
    }
    .tricolor-bar {
      height: 6px;
      background: linear-gradient(to right, #FF9933 33.33%, #FFFFFF 33.33%, #FFFFFF 66.66%, #138808 66.66%);
      width: 100%;
    }
    .header {
      text-align: center;
      padding: 16px 0 12px;
      border-bottom: 2px solid #0F2B46;
    }
    .header h1 {
      font-size: 14pt;
      color: #0F2B46;
      font-weight: 800;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .header h2 {
      font-size: 10pt;
      color: #D97706;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .header p {
      font-size: 8pt;
      color: #666;
      margin-top: 2px;
    }
    .family-header {
      margin-top: 16px;
      padding: 14px 18px;
      background: linear-gradient(135deg, #0F2B46 0%, #1E3A5F 100%);
      color: white;
      border-radius: 6px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .family-header .left h3 {
      font-size: 16pt;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .family-header .left .location {
      margin-top: 6px;
      font-size: 9pt;
      color: rgba(255,255,255,0.85);
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .family-header .left .location span {
      background: rgba(255,255,255,0.15);
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 8pt;
    }
    .family-header .right {
      text-align: right;
    }
    .family-header .right .pdf-badge {
      font-size: 12pt;
      font-weight: 700;
      color: #FBBF24;
      letter-spacing: 1px;
    }
    .family-header .right .status {
      margin-top: 6px;
      font-size: 9pt;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 4px;
      display: inline-block;
    }
    .status-eligible { background: #DCFCE7; color: #15803D; }
    .status-ineligible { background: #FEE2E2; color: #DC2626; }

    .section {
      margin-top: 14px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 10pt;
      font-weight: 700;
      color: #0F2B46;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      border-left: 4px solid #D97706;
      padding-left: 8px;
      margin-bottom: 8px;
    }

    .stats-row {
      display: flex;
      gap: 10px;
      margin-top: 14px;
    }
    .stat-card {
      flex: 1;
      text-align: center;
      padding: 10px 8px;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      background: #F8FAFC;
    }
    .stat-card .value {
      font-size: 16pt;
      font-weight: 700;
      color: #0F2B46;
    }
    .stat-card .label {
      font-size: 7pt;
      color: #94A3B8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 2px;
    }

    .timeline {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 8px;
      position: relative;
      padding: 8px 0;
    }
    .timeline::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 10%;
      right: 10%;
      height: 2px;
      background: #E2E8F0;
      z-index: 0;
    }
    .timeline-progress {
      position: absolute;
      top: 50%;
      left: 10%;
      height: 2px;
      background: #15803D;
      z-index: 1;
    }
    .step {
      position: relative;
      z-index: 2;
      text-align: center;
      flex: 1;
    }
    .step .circle {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 4px;
      font-size: 8pt;
      font-weight: 700;
    }
    .step.completed .circle { background: #15803D; color: white; }
    .step.current .circle { background: #D97706; color: white; box-shadow: 0 0 0 3px rgba(217,119,6,0.3); }
    .step.pending .circle { background: #F1F5F9; color: #94A3B8; border: 2px solid #CBD5E1; }
    .step .step-label { font-size: 7pt; color: #64748B; font-weight: 600; }
    .step .step-date { font-size: 6pt; color: #94A3B8; }

    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .detail-item {
      display: flex;
      justify-content: space-between;
      padding: 6px 10px;
      border-bottom: 1px solid #F1F5F9;
    }
    .detail-item .label {
      font-size: 9pt;
      color: #64748B;
    }
    .detail-item .value {
      font-size: 9pt;
      font-weight: 600;
      color: #0F2B46;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
      font-size: 9pt;
    }
    thead th {
      background: #0F2B46;
      color: white;
      padding: 7px 8px;
      text-align: left;
      font-size: 8pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    thead th:first-child { border-radius: 4px 0 0 0; }
    thead th:last-child { border-radius: 0 4px 0 0; }
    tbody td {
      padding: 6px 8px;
      border-bottom: 1px solid #F1F5F9;
      color: #334155;
    }
    tbody tr:nth-child(even) { background: #F8FAFC; }
    tbody tr:hover { background: #FFFBEB; }

    .footer {
      margin-top: 24px;
      padding-top: 10px;
      border-top: 2px solid #E2E8F0;
      text-align: center;
      font-size: 7pt;
      color: #94A3B8;
    }
    .footer .tricolor-sm {
      height: 3px;
      background: linear-gradient(to right, #FF9933 33.33%, #FFFFFF 33.33%, #FFFFFF 66.66%, #138808 66.66%);
      width: 60px;
      margin: 0 auto 6px;
      border-radius: 2px;
    }

    .plot-card {
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-radius: 6px;
      padding: 12px 16px;
      margin-top: 4px;
    }
    .plot-card.no-plot {
      background: #FEF3C7;
      border-color: #FDE68A;
    }

    @media print {
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <!-- Tricolor Bar -->
  <div class="tricolor-bar"></div>

  <!-- Government Header -->
  <div class="header">
    <h1>POLAVARAM IRRIGATION PROJECT</h1>
    <h2>Rehabilitation &amp; Resettlement Division</h2>
    <p>Government of Andhra Pradesh &bull; Socio-Economic Survey Report</p>
  </div>

  <!-- Family Header Card -->
  <div class="family-header">
    <div class="left">
      <h3>${family.beneficiaryName}</h3>
      <div class="location">
        <span>${family.village.mandal.name} Mandal</span>
        <span>${family.village.name} Village</span>
      </div>
    </div>
    <div class="right">
      <div class="pdf-badge">#${family.pdfId}</div>
      <div class="status ${rrCssClass}">${rrLabel}</div>
    </div>
  </div>

  <!-- Quick Stats -->
  <div class="stats-row">
    <div class="stat-card">
      <div class="value">${family.members.length}</div>
      <div class="label">Members</div>
    </div>
    <div class="stat-card">
      <div class="value">${minorCount}</div>
      <div class="label">Minors</div>
    </div>
    <div class="stat-card">
      <div class="value">${landAcres || 0}</div>
      <div class="label">Land (acres)</div>
    </div>
    <div class="stat-card">
      <div class="value">${family.caste || 'N/A'}</div>
      <div class="label">Caste</div>
    </div>
  </div>

  <!-- Status Timeline -->
  <div class="section">
    <div class="section-title">Status Timeline</div>
    <div class="timeline">
      ${timelinePos >= 0 ? `<div class="timeline-progress" style="width: ${(timelinePos / 3) * 80 + 10}%;"></div>` : ''}
      ${timelineSteps.map((step, i) => {
        const isCompleted = i <= timelinePos;
        const isCurrent = i === timelinePos;
        const cls = isCurrent ? 'current' : isCompleted ? 'completed' : 'pending';
        return `<div class="step ${cls}">
          <div class="circle">${i + 1}</div>
          <div class="step-label">${step.label}</div>
          <div class="step-date">${step.date}</div>
        </div>`;
      }).join('')}
    </div>
  </div>

  <!-- Family Details -->
  <div class="section">
    <div class="section-title">Family Details</div>
    <div class="details-grid">
      <div class="detail-item"><span class="label">Caste Category</span><span class="value">${family.caste || 'N/A'}${family.subCaste ? ' (' + family.subCaste + ')' : ''}</span></div>
      <div class="detail-item"><span class="label">Land Holding</span><span class="value">${landAcres ? landAcres + ' acres' : 'N/A'}</span></div>
      <div class="detail-item"><span class="label">House Type</span><span class="value">${family.houseType || 'N/A'}</span></div>
      <div class="detail-item"><span class="label">First Scheme</span><span class="value">${hasFirstScheme ? 'Eligible' : 'Not Eligible'}</span></div>
      <div class="detail-item"><span class="label">Total Members</span><span class="value">${family.members.length}</span></div>
      <div class="detail-item"><span class="label">Minors</span><span class="value">${minorCount}</span></div>
      ${totalCompensation ? `<div class="detail-item"><span class="label">Total Compensation</span><span class="value">₹${totalCompensation.toLocaleString('en-IN')}</span></div>` : ''}
      <div class="detail-item"><span class="label">Occupation</span><span class="value">${family.occupation || 'N/A'}</span></div>
    </div>
  </div>

  <!-- Plot Allotment -->
  <div class="section">
    <div class="section-title">Plot Allotment</div>
    ${family.plotAllotment ? `
    <div class="plot-card">
      <div class="details-grid">
        <div class="detail-item"><span class="label">Plot Number</span><span class="value">${family.plotAllotment.plotNumber || 'Pending'}</span></div>
        <div class="detail-item"><span class="label">Colony</span><span class="value">${family.plotAllotment.colonyName || 'Pending'}</span></div>
        <div class="detail-item"><span class="label">Area</span><span class="value">${family.plotAllotment.areaSqYards ? family.plotAllotment.areaSqYards + ' sq. yards' : 'Pending'}</span></div>
        <div class="detail-item"><span class="label">Allotment Status</span><span class="value">${allotLabel}</span></div>
        ${family.plotAllotment.allotmentDate ? `<div class="detail-item"><span class="label">Allotment Date</span><span class="value">${new Date(family.plotAllotment.allotmentDate).toLocaleDateString('en-IN')}</span></div>` : ''}
      </div>
    </div>` : `
    <div class="plot-card no-plot">
      <p style="text-align: center; color: #B45309; font-size: 9pt;">No plot has been allotted yet.</p>
    </div>`}
  </div>

  ${compensationItems.length > 0 ? `
  <!-- Compensation Breakdown -->
  <div class="section">
    <div class="section-title">First Scheme Compensation Breakdown</div>
    <div class="details-grid">
      ${compensationItems.map(item => `
      <div class="detail-item"><span class="label">${item.label}</span><span class="value">${typeof item.value === 'number' ? '₹' + item.value.toLocaleString('en-IN') : item.value}</span></div>`).join('')}
    </div>
  </div>` : ''}

  <!-- Family Members Table -->
  <div class="section">
    <div class="section-title">Family Members</div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Name</th>
          <th>Relation</th>
          <th>Age</th>
          <th>Gender</th>
          <th>Alive / Died</th>
          <th>Aadhaar</th>
          <th>Occupation</th>
        </tr>
      </thead>
      <tbody>
        ${family.members.map((m, i) => {
          const aadharPlain = safeDecryptOrNull(m.aadharNoEnc);
          const aadharDisplay = aadharPlain
            ? (showFullPII ? aadharPlain : maskAadhar(aadharPlain))
            : 'N/A';
          return `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${m.beneficiaryName}</strong></td>
          <td>${m.relation}</td>
          <td>${m.age}${m.age < 18 ? ' <span style="font-size:6pt;color:#D97706;font-weight:600">MINOR</span>' : ''}</td>
          <td>${m.gender}</td>
          <td>${m.aliveOrDied || 'N/A'}</td>
          <td style="font-family:monospace;font-size:8pt">${aadharDisplay}</td>
          <td>${m.occupation || 'N/A'}</td>
        </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="tricolor-sm"></div>
    <p>Polavaram Irrigation Project &mdash; Rehabilitation &amp; Resettlement Division</p>
    <p>Government of Andhra Pradesh &bull; This is a computer-generated document &bull; Generated on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="family-${pdfId}-report.html"`,
      },
    });
  } catch (err) {
    const r = toAuthErrorResponse(err);
    if (r) return r;
    console.error('PDF generation error:', err);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
