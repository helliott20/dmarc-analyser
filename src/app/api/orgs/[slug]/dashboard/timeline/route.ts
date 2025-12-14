import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, domains, reports, records } from '@/db/schema';
import { eq, and, gte, inArray } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

async function getOrgAndCheckAccess(slug: string, userId: string) {
  const [membership] = await db
    .select({
      organization: organizations,
      role: orgMembers.role,
    })
    .from(organizations)
    .innerJoin(orgMembers, eq(organizations.id, orgMembers.organizationId))
    .where(and(eq(organizations.slug, slug), eq(orgMembers.userId, userId)));

  return membership;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const membership = await getOrgAndCheckAccess(slug, session.user.id);

    if (!membership) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const { organization } = membership;

    // Get URL params for time range
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '30', 10);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all domains for this org
    const orgDomains = await db
      .select({ id: domains.id, domain: domains.domain })
      .from(domains)
      .where(eq(domains.organizationId, organization.id));

    if (orgDomains.length === 0) {
      return NextResponse.json({
        daily: [],
        byDomain: [],
        summary: {
          totalMessages: 0,
          passedMessages: 0,
          failedMessages: 0,
          passRate: 0,
        },
      });
    }

    const domainIds = orgDomains.map((d) => d.id);
    const domainIdToName = new Map(orgDomains.map((d) => [d.id, d.domain]));

    // Get all reports in the time range
    const reportsInRange = await db
      .select({
        id: reports.id,
        domainId: reports.domainId,
        dateRangeBegin: reports.dateRangeBegin,
      })
      .from(reports)
      .where(
        and(
          inArray(reports.domainId, domainIds),
          gte(reports.dateRangeBegin, startDate)
        )
      );

    if (reportsInRange.length === 0) {
      return NextResponse.json({
        daily: [],
        byDomain: [],
        summary: {
          totalMessages: 0,
          passedMessages: 0,
          failedMessages: 0,
          passRate: 0,
        },
      });
    }

    const reportIds = reportsInRange.map((r) => r.id);
    const reportDateMap = new Map(
      reportsInRange.map((r) => [r.id, { date: r.dateRangeBegin, domainId: r.domainId }])
    );

    // Get all records for these reports
    const allRecords = await db
      .select({
        reportId: records.reportId,
        count: records.count,
        dmarcDkim: records.dmarcDkim,
        dmarcSpf: records.dmarcSpf,
      })
      .from(records)
      .where(inArray(records.reportId, reportIds));

    // Aggregate data by date
    const dailyData = new Map<
      string,
      {
        date: string;
        total: number;
        passed: number;
        failed: number;
      }
    >();

    // Aggregate data by domain
    const domainData = new Map<
      string,
      {
        domainId: string;
        domain: string;
        total: number;
        passed: number;
        failed: number;
      }
    >();

    let totalMessages = 0;
    let passedMessages = 0;
    let failedMessages = 0;

    for (const record of allRecords) {
      const reportInfo = reportDateMap.get(record.reportId);
      if (!reportInfo) continue;

      const dateKey = new Date(reportInfo.date).toISOString().split('T')[0];
      const isPassing = record.dmarcDkim === 'pass' || record.dmarcSpf === 'pass';

      // Update daily data
      if (!dailyData.has(dateKey)) {
        dailyData.set(dateKey, {
          date: dateKey,
          total: 0,
          passed: 0,
          failed: 0,
        });
      }

      const day = dailyData.get(dateKey)!;
      day.total += record.count;
      if (isPassing) {
        day.passed += record.count;
      } else {
        day.failed += record.count;
      }

      // Update domain data
      if (!domainData.has(reportInfo.domainId)) {
        domainData.set(reportInfo.domainId, {
          domainId: reportInfo.domainId,
          domain: domainIdToName.get(reportInfo.domainId) || 'Unknown',
          total: 0,
          passed: 0,
          failed: 0,
        });
      }

      const domain = domainData.get(reportInfo.domainId)!;
      domain.total += record.count;
      if (isPassing) {
        domain.passed += record.count;
      } else {
        domain.failed += record.count;
      }

      // Update totals
      totalMessages += record.count;
      if (isPassing) {
        passedMessages += record.count;
      } else {
        failedMessages += record.count;
      }
    }

    // Sort daily data by date
    const daily = Array.from(dailyData.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // Sort domain data by total volume (descending)
    const byDomain = Array.from(domainData.values())
      .sort((a, b) => b.total - a.total)
      .map((d) => ({
        ...d,
        passRate: d.total > 0 ? Math.round((d.passed / d.total) * 100) : 0,
      }));

    const passRate =
      totalMessages > 0
        ? Math.round((passedMessages / totalMessages) * 1000) / 10
        : 0;

    return NextResponse.json({
      daily,
      byDomain,
      summary: {
        totalMessages,
        passedMessages,
        failedMessages,
        passRate,
      },
    });
  } catch (error) {
    console.error('Failed to get dashboard timeline data:', error);
    return NextResponse.json(
      { error: 'Failed to get dashboard timeline data' },
      { status: 500 }
    );
  }
}
