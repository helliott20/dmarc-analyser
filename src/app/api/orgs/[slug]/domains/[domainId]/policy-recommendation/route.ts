import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import {
  organizations,
  orgMembers,
  domains,
  reports,
  records,
  sources,
} from '@/db/schema';
import { eq, and, gte, inArray, count, sql } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ slug: string; domainId: string }>;
}

async function getDomainWithAccess(
  domainId: string,
  orgSlug: string,
  userId: string
) {
  const [result] = await db
    .select({
      domain: domains,
      organization: organizations,
      role: orgMembers.role,
    })
    .from(domains)
    .innerJoin(organizations, eq(domains.organizationId, organizations.id))
    .innerJoin(orgMembers, eq(organizations.id, orgMembers.organizationId))
    .where(
      and(
        eq(domains.id, domainId),
        eq(organizations.slug, orgSlug),
        eq(orgMembers.userId, userId)
      )
    );

  return result;
}

function parseDmarcPolicy(dmarcRecord: string | null): string {
  if (!dmarcRecord) return 'none';
  const match = dmarcRecord.match(/p=(\w+)/);
  if (!match) return 'none';
  const policy = match[1].toLowerCase();
  if (['none', 'quarantine', 'reject'].includes(policy)) {
    return policy;
  }
  return 'none';
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug, domainId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getDomainWithAccess(domainId, slug, session.user.id);

    if (!result) {
      return NextResponse.json(
        { error: 'Domain not found or insufficient permissions' },
        { status: 404 }
      );
    }

    const { domain } = result;

    // Get date ranges
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get all reports for this domain
    const allReports = await db
      .select({
        id: reports.id,
        dateRangeBegin: reports.dateRangeBegin,
      })
      .from(reports)
      .where(eq(reports.domainId, domainId));

    if (allReports.length === 0) {
      return NextResponse.json({
        currentPolicy: parseDmarcPolicy(domain.dmarcRecord),
        recommendedPolicy: 'none',
        confidence: 0,
        passRate: 0,
        passRate7Days: 0,
        passRate30Days: 0,
        totalMessages: 0,
        uniqueSources: 0,
        knownSources: 0,
        unknownSources: 0,
        daysMonitored: 0,
        readyToUpgrade: false,
        blockers: ['No DMARC reports received yet'],
        achievements: [],
      });
    }

    // Calculate days monitored
    const oldestReport = allReports.reduce((oldest, r) =>
      r.dateRangeBegin < oldest.dateRangeBegin ? r : oldest
    );
    const daysMonitored = Math.floor(
      (now.getTime() - new Date(oldestReport.dateRangeBegin).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    // Get all records
    const reportIds = allReports.map((r) => r.id);
    const allRecords = reportIds.length > 0
      ? await db
          .select({
            reportId: records.reportId,
            count: records.count,
            dmarcDkim: records.dmarcDkim,
            dmarcSpf: records.dmarcSpf,
          })
          .from(records)
          .where(inArray(records.reportId, reportIds))
      : [];

    // Create report date map
    const reportDateMap = new Map(
      allReports.map((r) => [r.id, r.dateRangeBegin])
    );

    // Calculate pass rates for different periods
    let total7Days = 0,
      passed7Days = 0;
    let total30Days = 0,
      passed30Days = 0;
    let totalAll = 0,
      passedAll = 0;

    for (const record of allRecords) {
      const isPassing =
        record.dmarcDkim === 'pass' || record.dmarcSpf === 'pass';
      const reportDate = reportDateMap.get(record.reportId);

      totalAll += record.count;
      if (isPassing) passedAll += record.count;

      if (reportDate && reportDate >= thirtyDaysAgo) {
        total30Days += record.count;
        if (isPassing) passed30Days += record.count;
      }

      if (reportDate && reportDate >= sevenDaysAgo) {
        total7Days += record.count;
        if (isPassing) passed7Days += record.count;
      }
    }

    const passRate = totalAll > 0 ? Math.round((passedAll / totalAll) * 1000) / 10 : 0;
    const passRate7Days = total7Days > 0 ? Math.round((passed7Days / total7Days) * 1000) / 10 : 0;
    const passRate30Days = total30Days > 0 ? Math.round((passed30Days / total30Days) * 1000) / 10 : 0;

    // Get source data
    const sourcesData = await db
      .select({
        id: sources.id,
        sourceType: sources.sourceType,
        knownSenderId: sources.knownSenderId,
      })
      .from(sources)
      .where(eq(sources.domainId, domainId));

    const uniqueSources = sourcesData.length;
    const knownSources = sourcesData.filter(
      (s) => s.sourceType === 'legitimate' || s.knownSenderId
    ).length;
    const unknownSources = sourcesData.filter(
      (s) => s.sourceType === 'unknown' && !s.knownSenderId
    ).length;

    // Parse current policy
    const currentPolicy = parseDmarcPolicy(domain.dmarcRecord);

    // Calculate recommendation
    const blockers: string[] = [];
    const achievements: string[] = [];
    let recommendedPolicy = currentPolicy;
    let confidence = 0;

    // Build achievements and blockers
    if (daysMonitored >= 30) {
      achievements.push(`${daysMonitored} days of monitoring data`);
    } else {
      blockers.push(`Need at least 30 days of data (currently ${daysMonitored})`);
    }

    if (totalAll >= 1000) {
      achievements.push(`${totalAll.toLocaleString()} messages analyzed`);
    } else if (totalAll >= 100) {
      achievements.push(`${totalAll.toLocaleString()} messages analyzed`);
    } else {
      blockers.push(`Need more message volume (currently ${totalAll})`);
    }

    if (passRate30Days >= 95) {
      achievements.push(`Excellent 30-day pass rate: ${passRate30Days}%`);
    } else if (passRate30Days >= 80) {
      blockers.push(`Pass rate should be above 95% (currently ${passRate30Days}%)`);
    } else {
      blockers.push(`Pass rate too low: ${passRate30Days}%`);
    }

    if (passRate7Days >= 95) {
      achievements.push(`Consistent recent performance: ${passRate7Days}% (7 days)`);
    } else if (passRate7Days < passRate30Days - 5) {
      blockers.push(`Recent pass rate declining (7-day: ${passRate7Days}%)`);
    }

    if (unknownSources === 0) {
      achievements.push('All sources identified');
    } else if (unknownSources <= 3) {
      blockers.push(`${unknownSources} unknown source(s) need classification`);
    } else {
      blockers.push(`${unknownSources} unknown sources need investigation`);
    }

    // Determine recommendation based on current policy and metrics
    if (currentPolicy === 'none') {
      // Can we move to quarantine?
      if (
        passRate30Days >= 95 &&
        passRate7Days >= 90 &&
        daysMonitored >= 14 &&
        totalAll >= 100 &&
        unknownSources <= 5
      ) {
        recommendedPolicy = 'quarantine';
        confidence = Math.min(
          100,
          Math.round(
            (passRate30Days * 0.4 +
              (daysMonitored >= 30 ? 30 : daysMonitored) * 1 +
              Math.min(totalAll / 100, 20) +
              (uniqueSources > 0 ? (knownSources / uniqueSources) * 20 : 0))
          )
        );
      } else {
        recommendedPolicy = 'none';
        confidence = 50;
      }
    } else if (currentPolicy === 'quarantine') {
      // Can we move to reject?
      if (
        passRate30Days >= 98 &&
        passRate7Days >= 95 &&
        daysMonitored >= 30 &&
        totalAll >= 500 &&
        unknownSources === 0
      ) {
        recommendedPolicy = 'reject';
        confidence = Math.min(
          100,
          Math.round(
            (passRate30Days * 0.5 +
              (daysMonitored >= 60 ? 30 : daysMonitored / 2) +
              Math.min(totalAll / 500, 20))
          )
        );
      } else if (
        passRate30Days >= 95 &&
        daysMonitored >= 14
      ) {
        recommendedPolicy = 'quarantine';
        confidence = 70;
      } else {
        // Maybe should go back to none
        recommendedPolicy = passRate30Days >= 80 ? 'quarantine' : 'none';
        confidence = 40;
        if (passRate30Days < 80) {
          blockers.push('Consider reverting to p=none to investigate issues');
        }
      }
    } else if (currentPolicy === 'reject') {
      // Already at reject - check if it's working well
      if (passRate30Days >= 95) {
        recommendedPolicy = 'reject';
        confidence = 95;
        achievements.push('Reject policy working effectively');
      } else {
        recommendedPolicy = 'quarantine';
        confidence = 60;
        blockers.push('Pass rate has dropped - consider relaxing policy temporarily');
      }
    }

    const readyToUpgrade =
      blockers.length === 0 &&
      ['none', 'quarantine'].includes(currentPolicy) &&
      recommendedPolicy !== currentPolicy &&
      ['quarantine', 'reject'].indexOf(recommendedPolicy) >
        ['quarantine', 'reject'].indexOf(currentPolicy);

    return NextResponse.json({
      currentPolicy,
      recommendedPolicy,
      confidence,
      passRate,
      passRate7Days,
      passRate30Days,
      totalMessages: totalAll,
      uniqueSources,
      knownSources,
      unknownSources,
      daysMonitored,
      readyToUpgrade,
      blockers,
      achievements,
    });
  } catch (error) {
    console.error('Failed to get policy recommendation:', error);
    return NextResponse.json(
      { error: 'Failed to get policy recommendation' },
      { status: 500 }
    );
  }
}
