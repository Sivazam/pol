import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // ── KPIs ──
    const totalFamilies = await db.family.count();
    const totalMembers = await db.familyMember.count();

    const eligibilityCounts = await db.family.groupBy({ by: ['rrEligibility'], _count: true });
    const eligibilityMap: Record<string, number> = {};
    eligibilityCounts.forEach(s => { eligibilityMap[s.rrEligibility] = s._count; });

    const eligibleCount = eligibilityMap['Eligible'] || 0;
    const rehabilitationRate = totalFamilies ? +((eligibleCount / totalFamilies) * 100).toFixed(1) : 0;

    // Average land holding from FirstScheme
    const landResult = await db.firstScheme.aggregate({
      _avg: { extentOfLandAcCts: true },
      _count: { extentOfLandAcCts: true },
      where: { extentOfLandAcCts: { not: null } },
    });
    const avgLandHolding = landResult._avg.extentOfLandAcCts ? +landResult._avg.extentOfLandAcCts.toFixed(2) : 0;

    // Average family size
    const avgFamilySize = totalFamilies ? +((totalMembers / totalFamilies)).toFixed(1) : 0;

    // Plot allotment rate
    const plotCounts = await db.plotAllotment.groupBy({ by: ['allotmentStatus'], _count: true });
    const plotMap: Record<string, number> = {};
    plotCounts.forEach(p => { plotMap[p.allotmentStatus] = p._count; });
    const allottedOrPossession = (plotMap['ALLOTTED'] || 0) + (plotMap['POSSESSION_GIVEN'] || 0);
    const totalPlots = Object.values(plotMap).reduce((a, b) => a + b, 0);
    const plotAllotmentRate = totalPlots ? +((allottedOrPossession / totalPlots) * 100).toFixed(1) : 0;

    // ── R&R Eligibility by Mandal ──
    const mandals = await db.mandal.findMany({ include: { villages: { select: { id: true } } } });
    const eligibilityByMandal = await Promise.all(mandals.map(async (m) => {
      const villageIds = m.villages.map(v => v.id);
      const mEligibilityCounts = await db.family.groupBy({
        by: ['rrEligibility'],
        _count: true,
        where: { villageId: { in: villageIds } },
      });
      const mEligibilityMap: Record<string, number> = {};
      mEligibilityCounts.forEach(s => { mEligibilityMap[s.rrEligibility] = s._count; });

      return {
        mandalName: m.name,
        mandalCode: m.code,
        color: m.color,
        Eligible: mEligibilityMap['Eligible'] || 0,
        Ineligible: mEligibilityMap['Ineligible'] || 0,
      };
    }));

    // ── Monthly Progress (mock data for 12 months) ──
    const months = ['Jan 2025', 'Feb 2025', 'Mar 2025', 'Apr 2025', 'May 2025', 'Jun 2025',
      'Jul 2025', 'Aug 2025', 'Sep 2025', 'Oct 2025', 'Nov 2025', 'Dec 2025'];
    const eligibleBase = eligibleCount;

    const monthlyProgress = months.map((month, i) => {
      const progress = (i + 1) / 12;
      const jitter = (Math.sin(i * 2.7) * 0.05);
      const p = Math.min(progress + jitter, 1);
      return {
        month,
        Eligible: Math.round(eligibleBase * p),
        FirstScheme: Math.round(eligibleBase * p * 0.7),
      };
    });

    // ── Village Comparison ──
    const villages = await db.village.findMany({
      include: {
        mandal: { select: { name: true, code: true } },
        families: {
          select: {
            rrEligibility: true,
            firstScheme: { select: { extentOfLandAcCts: true } },
          },
        },
      },
    });

    const villageComparison = villages.map(v => {
      const totalFam = v.families.length;
      const eligibleFamilies = v.families.filter(f => f.rrEligibility === 'Eligible').length;
      const landValues = v.families
        .filter(f => f.firstScheme?.extentOfLandAcCts != null)
        .map(f => f.firstScheme!.extentOfLandAcCts!);
      const avgLand = landValues.length ? +(landValues.reduce((a, b) => a + b, 0) / landValues.length).toFixed(2) : 0;

      const rrBreakdown = { Eligible: 0, Ineligible: 0 } as Record<string, number>;
      v.families.forEach(f => {
        if (rrBreakdown[f.rrEligibility] !== undefined) {
          rrBreakdown[f.rrEligibility]++;
        }
      });

      return {
        villageName: v.name,
        mandalName: v.mandal.name,
        mandalCode: v.mandal.code,
        totalFamilies: totalFam,
        firstSchemePct: totalFam ? +((eligibleFamilies / totalFam) * 100).toFixed(1) : 0,
        avgLand,
        rrBreakdown,
      };
    });

    // ── Land Distribution ──
    const allLands = await db.firstScheme.findMany({
      where: { extentOfLandAcCts: { not: null } },
      select: { extentOfLandAcCts: true },
    });
    const landDistribution = [
      { range: '0-1 acres', count: 0 },
      { range: '1-2 acres', count: 0 },
      { range: '2-5 acres', count: 0 },
      { range: '5-10 acres', count: 0 },
      { range: '10+ acres', count: 0 },
    ];
    allLands.forEach(f => {
      const acres = f.extentOfLandAcCts!;
      if (acres <= 1) landDistribution[0].count++;
      else if (acres <= 2) landDistribution[1].count++;
      else if (acres <= 5) landDistribution[2].count++;
      else if (acres <= 10) landDistribution[3].count++;
      else landDistribution[4].count++;
    });

    // ── Caste Distribution ──
    const casteCounts = await db.family.groupBy({
      by: ['caste'],
      _count: true,
      where: { caste: { not: null } },
    });
    const casteCategories: Record<string, string> = {
      'St': 'Scheduled Tribe',
      'Sc': 'Scheduled Caste',
      'Bc': 'Backward Class',
      'Oc': 'Open Category',
    };
    const totalWithCaste = casteCounts.reduce((a, c) => a + c._count, 0);
    const casteDistribution = casteCounts
      .map(c => ({
        caste: casteCategories[c.caste!] || c.caste || 'Unknown',
        count: c._count,
        percentage: totalWithCaste ? +((c._count / totalWithCaste) * 100).toFixed(1) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      kpis: {
        rehabilitationRate,
        avgLandHolding,
        avgFamilySize,
        plotAllotmentRate,
      },
      eligibilityByMandal,
      monthlyProgress,
      villageComparison,
      landDistribution,
      casteDistribution,
    });
  } catch (error) {
    console.error('Reports API error:', error);
    return NextResponse.json({ error: 'Failed to fetch reports data' }, { status: 500 });
  }
}
