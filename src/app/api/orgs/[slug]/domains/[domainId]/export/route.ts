import { NextRequest } from 'next/server';
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
import { eq, and, gte, lte, inArray, sql, countDistinct } from 'drizzle-orm';
import {
  generateReportsCSV,
  generateSourcesCSV,
  generateTimelineCSV,
  createCSVResponse,
  ReportExportRow,
  SourceExportRow,
  TimelineExportRow,
} from '@/lib/csv';

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

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug, domainId } = await params;

    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await getDomainWithAccess(domainId, slug, session.user.id);

    if (!result) {
      return new Response(
        JSON.stringify({ error: 'Domain not found or insufficient permissions' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { domain } = result;
    const url = new URL(request.url);
    const exportType = url.searchParams.get('type') as 'reports' | 'sources' | 'timeline';
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');

    if (!exportType || !['reports', 'sources', 'timeline'].includes(exportType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid export type. Must be: reports, sources, or timeline' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse date filters
    const dateFromFilter = dateFrom ? new Date(dateFrom) : null;
    const dateToFilter = dateTo ? new Date(dateTo) : null;

    // Generate timestamp for filename
    const timestamp = new Date().toISOString().split('T')[0];

    switch (exportType) {
      case 'reports': {
        // Build query for reports
        const conditions = [eq(reports.domainId, domainId)];
        if (dateFromFilter) {
          conditions.push(gte(reports.dateRangeBegin, dateFromFilter));
        }
        if (dateToFilter) {
          conditions.push(lte(reports.dateRangeEnd, dateToFilter));
        }

        // Get reports with records
        const reportsData = await db
          .select({
            reportId: reports.reportId,
            orgName: reports.orgName,
            domain: domains.domain,
            dateRangeStart: reports.dateRangeBegin,
            dateRangeEnd: reports.dateRangeEnd,
            id: reports.id,
          })
          .from(reports)
          .innerJoin(domains, eq(reports.domainId, domains.id))
          .where(and(...conditions))
          .orderBy(reports.dateRangeBegin);

        // Get all records for these reports
        const reportIds = reportsData.map(r => r.id);
        let recordsData: any[] = [];

        if (reportIds.length > 0) {
          recordsData = await db
            .select({
              reportId: records.reportId,
              sourceIp: records.sourceIp,
              count: records.count,
              dmarcSpf: records.dmarcSpf,
              dmarcDkim: records.dmarcDkim,
              disposition: records.disposition,
              policyOverrideReason: records.policyOverrideReason,
            })
            .from(records)
            .where(inArray(records.reportId, reportIds));
        }

        // Create a map for quick lookup
        const reportMap = new Map(reportsData.map(r => [r.id, r]));

        // Build export rows
        const exportData: ReportExportRow[] = recordsData.map(record => {
          const report = reportMap.get(record.reportId);
          return {
            reportId: report?.reportId || '',
            orgName: report?.orgName || '',
            domain: report?.domain || '',
            dateRangeStart: report?.dateRangeStart || new Date(),
            dateRangeEnd: report?.dateRangeEnd || new Date(),
            sourceIp: record.sourceIp.toString(),
            sourceCount: record.count,
            spfResult: record.dmarcSpf || 'none',
            dkimResult: record.dmarcDkim || 'none',
            dmarcDisposition: record.disposition || 'none',
            policyOverride: record.policyOverrideReason ? JSON.stringify(record.policyOverrideReason) : '',
          };
        });

        const csv = generateReportsCSV(exportData);
        const filename = `${domain.domain}-reports-${timestamp}.csv`;
        return createCSVResponse(csv, filename);
      }

      case 'sources': {
        // Build query for sources
        const conditions = [eq(sources.domainId, domainId)];
        if (dateFromFilter) {
          conditions.push(gte(sources.firstSeen, dateFromFilter));
        }
        if (dateToFilter) {
          conditions.push(lte(sources.lastSeen, dateToFilter));
        }

        const sourcesData = await db
          .select({
            sourceIp: sources.sourceIp,
            hostname: sources.hostname,
            country: sources.country,
            city: sources.city,
            asn: sources.asn,
            organization: sources.organization,
            totalMessages: sources.totalMessages,
            passedMessages: sources.passedMessages,
            failedMessages: sources.failedMessages,
            firstSeen: sources.firstSeen,
            lastSeen: sources.lastSeen,
            sourceType: sources.sourceType,
          })
          .from(sources)
          .where(and(...conditions))
          .orderBy(sources.totalMessages);

        const exportData: SourceExportRow[] = sourcesData.map(source => ({
          sourceIp: source.sourceIp.toString(),
          hostname: source.hostname,
          country: source.country,
          city: source.city,
          asn: source.asn,
          organization: source.organization,
          totalMessages: Number(source.totalMessages),
          passCount: Number(source.passedMessages),
          failCount: Number(source.failedMessages),
          firstSeen: source.firstSeen,
          lastSeen: source.lastSeen,
          classification: source.sourceType,
        }));

        const csv = generateSourcesCSV(exportData);
        const filename = `${domain.domain}-sources-${timestamp}.csv`;
        return createCSVResponse(csv, filename);
      }

      case 'timeline': {
        // Build query for timeline data
        const conditions = [eq(reports.domainId, domainId)];
        if (dateFromFilter) {
          conditions.push(gte(reports.dateRangeBegin, dateFromFilter));
        }
        if (dateToFilter) {
          conditions.push(lte(reports.dateRangeEnd, dateToFilter));
        }

        // Get reports in range
        const reportsInRange = await db
          .select({
            id: reports.id,
            dateRangeBegin: reports.dateRangeBegin,
          })
          .from(reports)
          .where(and(...conditions));

        const reportIds = reportsInRange.map(r => r.id);
        let recordsData: any[] = [];

        if (reportIds.length > 0) {
          recordsData = await db
            .select({
              reportId: records.reportId,
              sourceIp: records.sourceIp,
              count: records.count,
              dmarcDkim: records.dmarcDkim,
              dmarcSpf: records.dmarcSpf,
            })
            .from(records)
            .where(inArray(records.reportId, reportIds));
        }

        // Create a map of reportId to date
        const reportDateMap = new Map(
          reportsInRange.map(r => [r.id, r.dateRangeBegin])
        );

        // Aggregate data by date
        const dailyData = new Map<string, {
          date: string;
          total: number;
          passed: number;
          failed: number;
          sources: Set<string>;
        }>();

        for (const record of recordsData) {
          const reportDate = reportDateMap.get(record.reportId);
          if (!reportDate) continue;

          const dateKey = new Date(reportDate).toISOString().split('T')[0];
          const isPassing = record.dmarcDkim === 'pass' || record.dmarcSpf === 'pass';

          if (!dailyData.has(dateKey)) {
            dailyData.set(dateKey, {
              date: dateKey,
              total: 0,
              passed: 0,
              failed: 0,
              sources: new Set(),
            });
          }

          const day = dailyData.get(dateKey)!;
          day.total += record.count;
          day.sources.add(record.sourceIp.toString());

          if (isPassing) {
            day.passed += record.count;
          } else {
            day.failed += record.count;
          }
        }

        // Build export rows
        const exportData: TimelineExportRow[] = Array.from(dailyData.values())
          .map(day => ({
            date: day.date,
            totalMessages: day.total,
            passed: day.passed,
            failed: day.failed,
            passRate: day.total > 0 ? Math.round((day.passed / day.total) * 1000) / 10 : 0,
            uniqueSources: day.sources.size,
          }))
          .sort((a, b) => a.date.localeCompare(b.date));

        const csv = generateTimelineCSV(exportData);
        const filename = `${domain.domain}-timeline-${timestamp}.csv`;
        return createCSVResponse(csv, filename);
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid export type' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Failed to generate export:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate export' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
