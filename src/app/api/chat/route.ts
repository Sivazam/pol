import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';
import { requireSession, toAuthErrorResponse, audit, type SessionContext as Ctx } from '@/lib/server-auth';
import { rateLimit, clientIp } from '@/lib/rate-limit';

// ─── In-memory conversation history per session ───────────────────
const conversationHistory = new Map<string, { role: string; content: string }[]>();
const MAX_HISTORY = 20;

// ─── Context fetchers ─────────────────────────────────────────────
async function fetchProjectContext(userMessage: string, ctx: Ctx): Promise<string> {
  const msg = userMessage.toLowerCase();
  const parts: string[] = [];
  // Officer scope: restrict mandal/village/family lookups to assigned mandal.
  const familyScope = ctx.role === 'OFFICER' && ctx.mandalId
    ? { deletedAt: null, village: { mandalId: ctx.mandalId } }
    : { deletedAt: null };

  // Always include overall stats
  const [totalFamilies, totalMembers, totalPlots, mandals] = await Promise.all([
    db.family.count(),
    db.familyMember.count(),
    db.plotAllotment.count(),
    db.mandal.findMany({
      include: {
        villages: {
          include: { _count: { select: { families: true } } },
        },
      },
    }),
  ]);

  const eligibilityStatuses = await db.family.groupBy({ by: ['rrEligibility'], _count: true });
  const allotmentStatuses = await db.plotAllotment.groupBy({ by: ['allotmentStatus'], _count: true });

  parts.push(
    `PROJECT OVERVIEW: Polavaram Irrigation Project Rehabilitation & Resettlement Portal. ` +
    `Total families: ${totalFamilies.toLocaleString()}, Total members: ${totalMembers.toLocaleString()}, Total plots: ${totalPlots.toLocaleString()}. ` +
    `3 Mandals: VR Puram (code: VRP), Chintoor (code: CHN), Kunavaram (code: KUN). 30 Villages total.`
  );

  parts.push(
    `R&R ELIGIBILITY BREAKDOWN: ${eligibilityStatuses.map((s) => `${s.rrEligibility}: ${s._count}`).join(', ')}.`
  );

  parts.push(
    `PLOT ALLOTMENT BREAKDOWN: ${allotmentStatuses.map((s) => `${s.allotmentStatus}: ${s._count}`).join(', ')}.`
  );

  // First scheme stats
  const firstSchemeCount = await db.firstScheme.count();
  parts.push(
    `FIRST SCHEME: ${firstSchemeCount} families have First Scheme compensation records.`
  );

  // If user mentions a specific mandal, include details
  for (const mandal of mandals) {
    const mandalNameLower = mandal.name.toLowerCase();
    const mandalCodeLower = mandal.code.toLowerCase();
    if (msg.includes(mandalNameLower) || msg.includes(mandalCodeLower)) {
      const villageList = mandal.villages
        .map((v) => `${v.name} (${v._count.families} families)`)
        .join(', ');
      const mFamilyCount = mandal.villages.reduce((acc, v) => acc + v._count.families, 0);

      // Get R&R eligibility breakdown for this mandal
      const mandalVillageIds = mandal.villages.map((v) => v.id);
      const mandalEligibility = await db.family.groupBy({
        by: ['rrEligibility'],
        where: { villageId: { in: mandalVillageIds } },
        _count: true,
      });

      parts.push(
        `MANDAL "${mandal.name}" (Code: ${mandal.code}): ${mFamilyCount} families across ${mandal.villages.length} villages. ` +
        `Villages: ${villageList}. ` +
        `R&R Eligibility: ${mandalEligibility.map((s) => `${s.rrEligibility}: ${s._count}`).join(', ')}.`
      );
    }
  }

  // If user mentions a specific village, include details
  const villageMatch = msg.match(/village\s+(\w+[\w\s]*?)(?:\s|$|\?|\.|,)/i);
  if (villageMatch) {
    const searchName = villageMatch[1].trim();
    const village = await db.village.findFirst({
      where: {
        OR: [
          { name: { contains: searchName, mode: 'insensitive' } },
          { nameTelugu: { contains: searchName } },
          { code: { contains: searchName, mode: 'insensitive' } },
        ],
      },
      include: {
        mandal: true,
        _count: { select: { families: true } },
      },
    });
    if (village) {
      const vEligibility = await db.family.groupBy({
        by: ['rrEligibility'],
        where: { villageId: village.id },
        _count: true,
      });
      const vMembers = await db.familyMember.count({
        where: { family: { villageId: village.id } },
      });
      parts.push(
        `VILLAGE "${village.name}" (Code: ${village.code}, Mandal: ${village.mandal.name}): ` +
        `${village._count.families} families, ${vMembers} members. ` +
        `R&R Eligibility: ${vEligibility.map((s) => `${s.rrEligibility}: ${s._count}`).join(', ')}.`
      );
    }
  }

  // If user asks about families, eligibility, or rehabilitation progress
  if (
    msg.includes('progress') ||
    msg.includes('rehabilitation') ||
    msg.includes('eligible') ||
    msg.includes('ineligible') ||
    msg.includes('how many')
  ) {
    const eligible = eligibilityStatuses.find((s) => s.rrEligibility === 'Eligible')?._count ?? 0;
    const ineligible = eligibilityStatuses.find((s) => s.rrEligibility === 'Ineligible')?._count ?? 0;
    const progressPercent = ((eligible) / totalFamilies * 100).toFixed(1);
    const allotted = allotmentStatuses.find((s) => s.allotmentStatus === 'ALLOTTED')?._count ?? 0;
    const possession = allotmentStatuses.find((s) => s.allotmentStatus === 'POSSESSION_GIVEN')?._count ?? 0;
    const pending = allotmentStatuses.find((s) => s.allotmentStatus === 'PENDING')?._count ?? 0;

    parts.push(
      `REHABILITATION PROGRESS: ${progressPercent}% of families are R&R Eligible. ` +
      `Eligible: ${eligible}, Ineligible: ${ineligible}. ` +
      `First Scheme records: ${firstSchemeCount}. ` +
      `Plot Allotment Pipeline - Pending: ${pending}, Allotted: ${allotted}, Possession Given: ${possession}.`
    );
  }

  // If user asks about plot allotment specifically
  if (msg.includes('plot') || msg.includes('allotment') || msg.includes('colony')) {
    const plotByColony = await db.plotAllotment.groupBy({
      by: ['colonyName'],
      _count: true,
      where: { colonyName: { not: null } },
      orderBy: { _count: { colonyName: 'desc' } },
      take: 10,
    });
    const allotted = allotmentStatuses.find((s) => s.allotmentStatus === 'ALLOTTED')?._count ?? 0;
    const possession = allotmentStatuses.find((s) => s.allotmentStatus === 'POSSESSION_GIVEN')?._count ?? 0;
    const pending = allotmentStatuses.find((s) => s.allotmentStatus === 'PENDING')?._count ?? 0;

    parts.push(
      `PLOT ALLOTMENT DETAILS: Total plots: ${totalPlots}. Pending: ${pending}, Allotted: ${allotted}, Possession: ${possession}. ` +
      `Top colonies: ${plotByColony.map((c) => `${c.colonyName} (${c._count})`).join(', ')}.`
    );
  }

  // If user asks about a specific family (PDF ID)
  const pdfMatch = msg.match(/pdf[-\s]*(\w+[-\s]*\d+)/i);
  if (pdfMatch) {
    const pdfNum = pdfMatch[1].replace(/\s/g, '').toUpperCase();
    const family = await db.family.findFirst({
      where: { pdfId: { contains: pdfNum, mode: 'insensitive' }, ...familyScope },
      select: {
        pdfId: true,
        beneficiaryName: true,
        caste: true,
        subCaste: true,
        rrEligibility: true,
        village: { select: { name: true, mandal: { select: { name: true } } } },
        firstScheme: { select: { totalCompensation: true, extentOfLandAcCts: true } },
        plotAllotment: { select: { plotNumber: true, colonyName: true, allotmentStatus: true } },
        _count: { select: { members: true } },
      },
    });
    if (family) {
      const casteDisplay = family.subCaste ? `${family.caste} - ${family.subCaste}` : (family.caste || 'N/A');
      parts.push(
        `FAMILY ${family.pdfId}: Beneficiary: ${family.beneficiaryName}, ` +
        `Village: ${family.village.name} (Mandal: ${family.village.mandal.name}), ` +
        `Caste: ${casteDisplay}, ` +
        `R&R Eligibility: ${family.rrEligibility}, ` +
        `First Scheme: ${family.firstScheme ? `Yes (Total Compensation: Rs ${family.firstScheme.totalCompensation?.toLocaleString() || 'N/A'}, Land: ${family.firstScheme.extentOfLandAcCts ?? 'N/A'} acres)` : 'No'}, ` +
        `Members: ${family._count.members}, ` +
        `Plot: ${family.plotAllotment ? `${family.plotAllotment.plotNumber || 'N/A'} at ${family.plotAllotment.colonyName || 'N/A'} (${family.plotAllotment.allotmentStatus})` : 'Not allotted'}.`
      );
    }
  }

  // If user asks about land holdings
  if (msg.includes('land') || msg.includes('acre') || msg.includes('agriculture')) {
    const landStats = await db.firstScheme.aggregate({
      _avg: { extentOfLandAcCts: true },
      _min: { extentOfLandAcCts: true },
      _max: { extentOfLandAcCts: true },
      where: { extentOfLandAcCts: { not: null } },
    });
    const withLand = await db.firstScheme.count({ where: { extentOfLandAcCts: { gt: 0 } } });
    const landlessCount = await db.family.count({
      where: { firstScheme: { extentOfLandAcCts: { equals: 0 } } },
    });

    parts.push(
      `LAND HOLDINGS: Average: ${landStats._avg.extentOfLandAcCts?.toFixed(2) ?? 'N/A'} acres, ` +
      `Min: ${landStats._min.extentOfLandAcCts ?? 'N/A'}, Max: ${landStats._max.extentOfLandAcCts ?? 'N/A'} acres. ` +
      `Families with land: ${withLand}, Landless families: ${landlessCount}.`
    );
  }

  // If user asks about demographics / members
  if (msg.includes('member') || msg.includes('demographic') || msg.includes('gender') || msg.includes('age') || msg.includes('minor')) {
    const maleCount = await db.familyMember.count({ where: { gender: 'Male' } });
    const femaleCount = await db.familyMember.count({ where: { gender: 'Female' } });
    // Derive minors from age < 18
    const minorCount = await db.familyMember.count({ where: { age: { lt: 18 } } });
    const adultCount = totalMembers - minorCount;

    parts.push(
      `DEMOGRAPHICS: Total members: ${totalMembers.toLocaleString()}, Males: ${maleCount.toLocaleString()}, Females: ${femaleCount.toLocaleString()}, ` +
      `Minors (age < 18): ${minorCount.toLocaleString()}, Adults: ${adultCount.toLocaleString()}. ` +
      `Gender ratio: ${((maleCount / femaleCount) * 1000).toFixed(0)} males per 1000 females.`
    );
  }

  return parts.join('\n\n');
}

// ─── System prompt builder ────────────────────────────────────────
function buildSystemPrompt(context: string): string {
  return (
    `You are an AI assistant for the Polavaram Irrigation Project Rehabilitation & Resettlement (R&R) Portal. ` +
    `You are an expert on all aspects of this government project.\n\n` +
    `ABOUT THE PROJECT:\n` +
    `- The Polavaram Irrigation Project is a multi-purpose irrigation project on the Godavari River in Andhra Pradesh, India\n` +
    `- The project requires resettlement of families from the submergence area\n` +
    `- The R&R Portal tracks the rehabilitation progress of affected families\n\n` +
    `CURRENT DATA FROM THE DATABASE:\n${context}\n\n` +
    `YOUR ROLE:\n` +
    `- Answer questions about the Polavaram R&R project with accurate data from the database\n` +
    `- Provide statistics, comparisons, and insights about families, villages, mandals, and rehabilitation progress\n` +
    `- Explain R&R Eligibility: families are determined as "Eligible" or "Ineligible" for R&R benefits\n` +
    `- Explain First Scheme: eligible families get compensation packages (structure value, subsistence allowance, etc.)\n` +
    `- Explain Plot Allotment statuses: PENDING → ALLOTTED → POSSESSION_GIVEN\n` +
    `- Caste categories use: St (Scheduled Tribe), Sc (Scheduled Caste), Bc (Backward Class), Oc (Open Category) with sub-castes\n` +
    `- Be helpful, professional, and empathetic - these are real families affected by the project\n` +
    `- Use specific numbers from the data when possible\n` +
    `- If you don't have specific data, say so honestly rather than guessing\n` +
    `- Keep responses concise but informative\n` +
    `- Format numbers with commas for readability (e.g., 13,961)\n` +
    `- You can suggest navigating to specific views in the portal (Dashboard, Mandals, Villages, Families, Reports, Relocation)\n` +
    `- Respond in English unless the user writes in Telugu, then respond in Telugu\n\n` +
    `IMPORTANT: Always be respectful and professional. This is a government portal tracking sensitive rehabilitation data.`
  );
}

// ─── POST handler ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireSession();

    const ip = clientIp(req);
    const rl = rateLimit('chat', `${ctx.userId}:${ip}`, { max: 30, windowMs: 60_000 });
    if (!rl.ok) return NextResponse.json({ error: 'Too many chat requests — please slow down' }, { status: 429, headers: rl.headers });

    const body = await req.json();
    const { message, sessionId } = body;

    if (!message || typeof message !== 'string' || message.length > 2000) {
      return NextResponse.json({ error: 'Message is required (max 2000 chars)' }, { status: 400 });
    }

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Fetch relevant context from the database (PII never included; officer-scoped)
    const context = await fetchProjectContext(message, ctx);

    // Get or create conversation history
    let history = conversationHistory.get(sessionId) || [];
    history.push({ role: 'user', content: message });

    // Trim history if too long
    if (history.length > MAX_HISTORY) {
      history = history.slice(-MAX_HISTORY);
    }

    // Build system prompt with context
    const systemPrompt = buildSystemPrompt(context);

    // Call LLM
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        ...history,
      ],
      thinking: { type: 'disabled' },
    });

    const aiResponse = completion.choices?.[0]?.message?.content || 'I apologize, but I was unable to generate a response. Please try again.';

    // Save assistant response to history
    history.push({ role: 'assistant', content: aiResponse });
    if (history.length > MAX_HISTORY) {
      history = history.slice(-MAX_HISTORY);
    }
    conversationHistory.set(sessionId, history);

    await audit({
      ctx, action: 'CHAT_QUERY', resourceType: 'CHAT', resourceId: sessionId,
      ip, userAgent: req.headers.get('user-agent') ?? null,
      metadata: { messageLength: message.length, responseLength: aiResponse.length },
    });

    return NextResponse.json({
      response: aiResponse,
      context: context.slice(0, 200) + '...',
    });
  } catch (err) {
    const r = toAuthErrorResponse(err);
    if (r) return r;
    console.error('Chat API error:', err);
    return NextResponse.json(
      { error: 'Failed to generate response. Please try again.' },
      { status: 500 }
    );
  }
}
