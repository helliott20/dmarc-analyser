import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../redis';
import { QUEUE_NAMES } from '../queues';
import type { ScheduledReportJobData } from '../types';
import { db } from '@/db';
import { scheduledReports, domains, reports, records, sources, organizations } from '@/db/schema';
import { eq, and, gte, lte, sql, desc, count, sum } from 'drizzle-orm';
import { calculateNextRunAt } from '@/lib/scheduled-reports';
import { sendScheduledReportEmail } from '@/lib/email-service';
import { scheduleScheduledReportJobs } from '../scheduler';

interface ReportSummary {
  totalMessages: number;
  passRate: number;
  failedMessages: number;
  newSources: number;
}

async function calculateReportSummary(
  organizationId: string,
  domainId: string | null,
  periodStart: Date,
  periodEnd: Date
): Promise<ReportSummary & { domainName?: string }> {
  let domainName: string | undefined;
  let domainIds: string[] = [];

  if (domainId) {
    // Single domain
    domainIds = [domainId];
    const [domain] = await db
      .select({ domain: domains.domain })
      .from(domains)
      .where(eq(domains.id, domainId));
    domainName = domain?.domain;
  } else {
    // All domains for org
    const orgDomains = await db
      .select({ id: domains.id })
      .from(domains)
      .where(eq(domains.organizationId, organizationId));
    domainIds = orgDomains.map((d) => d.id);
  }

  if (domainIds.length === 0) {
    return { totalMessages: 0, passRate: 0, failedMessages: 0, newSources: 0, domainName };
  }

  // Get reports in the period
  const reportIds = await db
    .select({ id: reports.id })
    .from(reports)
    .where(
      and(
        sql`${reports.domainId} = ANY(${domainIds})`,
        gte(reports.dateRangeEnd, periodStart),
        lte(reports.dateRangeBegin, periodEnd)
      )
    );

  if (reportIds.length === 0) {
    return { totalMessages: 0, passRate: 100, failedMessages: 0, newSources: 0, domainName };
  }

  const reportIdList = reportIds.map((r) => r.id);

  // Calculate stats from records
  const [stats] = await db
    .select({
      total: sum(records.count),
      passedDkim: sql<number>`SUM(CASE WHEN ${records.dmarcDkim} = 'pass' THEN ${records.count} ELSE 0 END)`,
      passedSpf: sql<number>`SUM(CASE WHEN ${records.dmarcSpf} = 'pass' THEN ${records.count} ELSE 0 END)`,
    })
    .from(records)
    .where(sql`${records.reportId} = ANY(${reportIdList})`);

  const totalMessages = Number(stats?.total) || 0;
  const passedDkim = Number(stats?.passedDkim) || 0;
  const passedSpf = Number(stats?.passedSpf) || 0;
  // A message passes DMARC if either DKIM or SPF passes
  const passed = Math.max(passedDkim, passedSpf);
  const failed = totalMessages - passed;
  const passRate = totalMessages > 0 ? Math.round((passed / totalMessages) * 100) : 100;

  // Count new sources in the period
  const [sourceStats] = await db
    .select({ newCount: count() })
    .from(sources)
    .where(
      and(
        sql`${sources.domainId} = ANY(${domainIds})`,
        gte(sources.firstSeen, periodStart),
        lte(sources.firstSeen, periodEnd)
      )
    );

  const newSources = Number(sourceStats?.newCount) || 0;

  return {
    totalMessages,
    passRate,
    failedMessages: failed,
    newSources,
    domainName,
  };
}

function getPeriodDates(frequency: string, now: Date): { start: Date; end: Date } {
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);

  const start = new Date(end);

  switch (frequency) {
    case 'daily':
      start.setDate(start.getDate() - 1);
      break;
    case 'weekly':
      start.setDate(start.getDate() - 7);
      break;
    case 'monthly':
      start.setMonth(start.getMonth() - 1);
      break;
    default:
      start.setDate(start.getDate() - 1);
  }

  return { start, end };
}

async function processScheduledReport(job: Job<ScheduledReportJobData>): Promise<void> {
  const { scheduledReportId, organizationId } = job.data;

  console.log(`[Scheduled Reports] Processing report ${scheduledReportId}`);

  // Get the scheduled report config
  const [report] = await db
    .select()
    .from(scheduledReports)
    .where(
      and(
        eq(scheduledReports.id, scheduledReportId),
        eq(scheduledReports.isActive, true)
      )
    );

  if (!report) {
    console.log(`[Scheduled Reports] Report ${scheduledReportId} not found or inactive`);
    return;
  }

  try {
    // Parse recipients
    const recipients: string[] = JSON.parse(report.recipients);

    if (recipients.length === 0) {
      console.log(`[Scheduled Reports] No recipients for report ${scheduledReportId}`);
      return;
    }

    // Calculate the period
    const now = new Date();
    const { start, end } = getPeriodDates(report.frequency, now);

    // Get report summary
    const summary = await calculateReportSummary(
      organizationId,
      report.domainId,
      start,
      end
    );

    // Send the email
    const result = await sendScheduledReportEmail({
      organizationId,
      recipients,
      reportName: report.name,
      periodStart: start,
      periodEnd: end,
      domainName: summary.domainName,
      domainId: report.domainId || undefined,
      summary: {
        totalMessages: summary.totalMessages,
        passRate: summary.passRate,
        failedMessages: summary.failedMessages,
        newSources: summary.newSources,
      },
    });

    if (!result.success) {
      console.error(`[Scheduled Reports] Failed to send report ${scheduledReportId}:`, result.error);
      throw new Error(result.error || 'Failed to send report email');
    }

    // Calculate next run time
    const nextRunAt = calculateNextRunAt({
      frequency: report.frequency as 'daily' | 'weekly' | 'monthly',
      dayOfWeek: report.dayOfWeek ?? undefined,
      dayOfMonth: report.dayOfMonth ?? undefined,
      hour: report.hour,
      timezone: report.timezone || 'UTC',
    });

    // Update the report
    await db
      .update(scheduledReports)
      .set({
        lastSentAt: now,
        nextRunAt,
        updatedAt: now,
      })
      .where(eq(scheduledReports.id, scheduledReportId));

    console.log(`[Scheduled Reports] Report ${scheduledReportId} sent to ${recipients.length} recipients`);
  } catch (error) {
    console.error(`[Scheduled Reports] Error processing report ${scheduledReportId}:`, error);
    throw error;
  }
}

// Handle scheduled trigger vs direct report generation
async function processJob(job: Job<ScheduledReportJobData | { type: string }>): Promise<void> {
  // Check if this is a scheduler trigger
  if ('type' in job.data && job.data.type === 'scheduled') {
    console.log('[Scheduled Reports] Scheduler triggered - checking for due reports');
    await scheduleScheduledReportJobs();
    return;
  }

  // Direct report generation
  return processScheduledReport(job as Job<ScheduledReportJobData>);
}

// Create and export the worker
export function createScheduledReportsWorker() {
  const worker = new Worker(QUEUE_NAMES.SCHEDULED_REPORTS, processJob, {
    connection: createRedisConnection(),
    concurrency: 5,
  });

  worker.on('completed', (job) => {
    console.log(`[Scheduled Reports Worker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, error) => {
    console.error(`[Scheduled Reports Worker] Job ${job?.id} failed:`, error);
  });

  return worker;
}
