import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, domains, reports, records } from '@/db/schema';
import { eq, and, gte, lte, inArray } from 'drizzle-orm';

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

    // Get URL params for time range
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '30', 10);
    const startDateParam = url.searchParams.get('startDate');
    const endDateParam = url.searchParams.get('endDate');

    let startDate: Date;
    let endDate: Date = new Date();

    if (startDateParam && endDateParam) {
      // Custom date range
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
    } else {
      // Preset range (days ago)
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
    }

    // Get all reports in the time range
    const reportsInRange = await db
      .select({
        id: reports.id,
        dateRangeBegin: reports.dateRangeBegin,
        dateRangeEnd: reports.dateRangeEnd,
      })
      .from(reports)
      .where(
        and(
          eq(reports.domainId, domainId),
          gte(reports.dateRangeBegin, startDate),
          lte(reports.dateRangeBegin, endDate)
        )
      );

    if (reportsInRange.length === 0) {
      return NextResponse.json({
        daily: [],
        disposition: { none: 0, quarantine: 0, reject: 0 },
        authentication: { dkimPass: 0, dkimFail: 0, spfPass: 0, spfFail: 0 },
        summary: {
          totalMessages: 0,
          passedMessages: 0,
          failedMessages: 0,
          passRate: 0,
        },
      });
    }

    const reportIds = reportsInRange.map(r => r.id);

    // Get all records for these reports
    const allRecords = await db
      .select({
        reportId: records.reportId,
        count: records.count,
        disposition: records.disposition,
        dmarcDkim: records.dmarcDkim,
        dmarcSpf: records.dmarcSpf,
      })
      .from(records)
      .where(inArray(records.reportId, reportIds));

    // Create a map of reportId to date for aggregation
    const reportDateMap = new Map(
      reportsInRange.map(r => [r.id, r.dateRangeBegin])
    );

    // Aggregate data by date
    const dailyData = new Map<string, {
      date: string;
      total: number;
      passed: number;
      failed: number;
      none: number;
      quarantine: number;
      reject: number;
    }>();

    let totalMessages = 0;
    let passedMessages = 0;
    let failedMessages = 0;
    const disposition = { none: 0, quarantine: 0, reject: 0 };
    const authentication = { dkimPass: 0, dkimFail: 0, spfPass: 0, spfFail: 0 };

    for (const record of allRecords) {
      const reportDate = reportDateMap.get(record.reportId);
      if (!reportDate) continue;

      const dateKey = new Date(reportDate).toISOString().split('T')[0];
      const isPassing = record.dmarcDkim === 'pass' || record.dmarcSpf === 'pass';

      // Update daily data
      if (!dailyData.has(dateKey)) {
        dailyData.set(dateKey, {
          date: dateKey,
          total: 0,
          passed: 0,
          failed: 0,
          none: 0,
          quarantine: 0,
          reject: 0,
        });
      }

      const day = dailyData.get(dateKey)!;
      day.total += record.count;
      if (isPassing) {
        day.passed += record.count;
      } else {
        day.failed += record.count;
      }

      // Update disposition
      if (record.disposition === 'none') {
        day.none += record.count;
        disposition.none += record.count;
      } else if (record.disposition === 'quarantine') {
        day.quarantine += record.count;
        disposition.quarantine += record.count;
      } else if (record.disposition === 'reject') {
        day.reject += record.count;
        disposition.reject += record.count;
      }

      // Update authentication stats
      if (record.dmarcDkim === 'pass') {
        authentication.dkimPass += record.count;
      } else if (record.dmarcDkim === 'fail') {
        authentication.dkimFail += record.count;
      }

      if (record.dmarcSpf === 'pass') {
        authentication.spfPass += record.count;
      } else if (record.dmarcSpf === 'fail') {
        authentication.spfFail += record.count;
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

    const passRate = totalMessages > 0
      ? Math.round((passedMessages / totalMessages) * 1000) / 10
      : 0;

    return NextResponse.json({
      daily,
      disposition,
      authentication,
      summary: {
        totalMessages,
        passedMessages,
        failedMessages,
        passRate,
      },
    });
  } catch (error) {
    console.error('Failed to get timeline data:', error);
    return NextResponse.json(
      { error: 'Failed to get timeline data' },
      { status: 500 }
    );
  }
}
