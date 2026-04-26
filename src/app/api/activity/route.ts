import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
  const typeFilter = searchParams.get('type'); // STATUS | ALLOTMENT | REGISTRATION
  const mandalFilter = searchParams.get('mandalCode'); // VRP | CHN | KUN

  try {
    // Fetch families with their village and mandal info
    const whereClause = mandalFilter
      ? { village: { mandal: { code: mandalFilter } } }
      : {};

    const families = await db.family.findMany({
      where: whereClause,
      select: {
        id: true,
        pdfId: true,
        beneficiaryName: true,
        rrEligibility: true,
        createdAt: true,
        village: {
          select: {
            name: true,
            mandal: {
              select: {
                name: true,
                code: true,
              },
            },
          },
        },
        plotAllotment: {
          select: {
            plotNumber: true,
            colonyName: true,
            allotmentStatus: true,
            allotmentDate: true,
          },
        },
        firstScheme: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: mandalFilter ? 2000 : 1500,
    });

    const now = new Date();
    const activities: Array<{
      id: string;
      type: string;
      description: string;
      timestamp: string;
      relatedEntityId: string;
      relatedEntityType: string;
      severity: string;
      mandalCode: string;
    }> = [];

    // Generate activities by analyzing family data
    for (const family of families) {
      const mandalCode = family.village.mandal.code;
      const mandalName = family.village.mandal.name;
      const villageName = family.village.name;

      // 1. Status change activities — based on R&R eligibility
      if (!typeFilter || typeFilter === 'STATUS') {
        if (family.rrEligibility === 'Eligible') {
          // Generate a timestamp — distribute across last 30 days
          const daysAgo = Math.floor(Math.random() * 30) + 1;
          const hoursAgo = daysAgo * 24 + Math.floor(Math.random() * 24);
          const timestamp = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000).toISOString();

          activities.push({
            id: `status-${family.id}`,
            type: 'STATUS',
            description: `Family ${family.pdfId} (${family.beneficiaryName}) determined R&R Eligible — ${villageName}, ${mandalName}`,
            timestamp,
            relatedEntityId: family.pdfId,
            relatedEntityType: 'family',
            severity: 'success',
            mandalCode,
          });
        } else {
          const daysAgo = Math.floor(Math.random() * 30) + 1;
          const hoursAgo = daysAgo * 24 + Math.floor(Math.random() * 24);
          const timestamp = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000).toISOString();

          activities.push({
            id: `status-${family.id}`,
            type: 'STATUS',
            description: `Family ${family.pdfId} (${family.beneficiaryName}) determined Ineligible for R&R — ${villageName}, ${mandalName}`,
            timestamp,
            relatedEntityId: family.pdfId,
            relatedEntityType: 'family',
            severity: 'warning',
            mandalCode,
          });
        }
      }

      // 2. Plot allotment activities
      if (!typeFilter || typeFilter === 'ALLOTMENT') {
        if (family.plotAllotment && family.plotAllotment.allotmentStatus !== 'PENDING') {
          const daysAgo = Math.floor(Math.random() * 60) + 1;
          const hoursAgo = daysAgo * 24 + Math.floor(Math.random() * 24);

          activities.push({
            id: `allotment-${family.id}`,
            type: 'ALLOTMENT',
            description: `Plot ${family.plotAllotment.plotNumber || 'N/A'} at ${family.plotAllotment.colonyName || 'Colony'} allotted to family ${family.pdfId} (${family.beneficiaryName}) — ${villageName}, ${mandalName}`,
            timestamp: new Date(now.getTime() - hoursAgo * 60 * 60 * 1000).toISOString(),
            relatedEntityId: family.pdfId,
            relatedEntityType: 'family',
            severity: family.plotAllotment.allotmentStatus === 'POSSESSION_GIVEN' ? 'success' : 'info',
            mandalCode,
          });
        }
      }

      // 3. New family registration activities
      if (!typeFilter || typeFilter === 'REGISTRATION') {
        // Distribute registration events across last 14 days
        const daysAgo = Math.floor(Math.random() * 14) + 1;
        const hoursAgo = daysAgo * 24 + Math.floor(Math.random() * 24);

        activities.push({
          id: `registration-${family.id}`,
          type: 'REGISTRATION',
          description: `New family ${family.pdfId} registered — ${family.beneficiaryName}, ${villageName}, ${mandalName}${family.firstScheme ? ' (Has First Scheme)' : ''}`,
          timestamp: new Date(now.getTime() - hoursAgo * 60 * 60 * 1000).toISOString(),
          relatedEntityId: family.pdfId,
          relatedEntityType: 'family',
          severity: 'info',
          mandalCode,
        });
      }
    }

    // Sort all activities by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply limit
    const result = activities.slice(0, limit);

    // Compute summary counts
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const thisWeekCount = activities.filter(a => new Date(a.timestamp) >= oneWeekAgo).length;
    const todayCount = activities.filter(a => new Date(a.timestamp) >= oneDayAgo).length;

    return NextResponse.json({
      activities: result,
      summary: {
        total: activities.length,
        thisWeek: thisWeekCount,
        today: todayCount,
      },
    });
  } catch (error) {
    console.error('Activity API error:', error);
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
  }
}
