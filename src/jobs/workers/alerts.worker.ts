import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../redis';
import { QUEUE_NAMES, webhookDeliveryQueue } from '../queues';
import type { AlertsJobData, AlertsResult, WebhookDeliveryJobData } from '../types';
import { db } from '@/db';
import { reports, records, sources, domains, webhooks, alerts } from '@/db/schema';
import { eq, and, desc, gte, sql, sum, isNull } from 'drizzle-orm';
import { checkPassRateAlert, createAlert } from '@/lib/alerts';

async function getRecentPassRates(domainId: string, reportId: string): Promise<{
  current: number;
  previous: number;
}> {
  // Get the last 2 reports for this domain
  const recentReports = await db
    .select({ id: reports.id })
    .from(reports)
    .where(eq(reports.domainId, domainId))
    .orderBy(desc(reports.dateRangeEnd))
    .limit(2);

  if (recentReports.length < 2) {
    return { current: 100, previous: 100 };
  }

  // Calculate pass rate for current and previous report
  const calculatePassRate = async (reportId: string): Promise<number> => {
    const [stats] = await db
      .select({
        total: sum(records.count),
        passedDkim: sql<number>`SUM(CASE WHEN ${records.dmarcDkim} = 'pass' THEN ${records.count} ELSE 0 END)`,
        passedSpf: sql<number>`SUM(CASE WHEN ${records.dmarcSpf} = 'pass' THEN ${records.count} ELSE 0 END)`,
      })
      .from(records)
      .where(eq(records.reportId, reportId));

    const total = Number(stats?.total) || 0;
    if (total === 0) return 100;

    const passed = Math.max(Number(stats?.passedDkim) || 0, Number(stats?.passedSpf) || 0);
    return (passed / total) * 100;
  };

  const currentRate = await calculatePassRate(recentReports[0].id);
  const previousRate = await calculatePassRate(recentReports[1].id);

  return { current: currentRate, previous: previousRate };
}

const MIN_MESSAGE_THRESHOLD = 10; // Only alert for sources with 10+ messages
const DEDUP_WINDOW_HOURS = 24; // Don't re-alert for same source within 24 hours

async function checkForNewSources(
  organizationId: string,
  domainId: string,
  reportId: string
): Promise<number> {
  // Find sources that were first seen with this report
  const [report] = await db
    .select({ dateRangeBegin: reports.dateRangeBegin, dateRangeEnd: reports.dateRangeEnd })
    .from(reports)
    .where(eq(reports.id, reportId));

  if (!report) return 0;

  // Find new sources: first seen in report date range, no known sender, minimum volume
  const newSources = await db
    .select({
      id: sources.id,
      sourceIp: sources.sourceIp,
      hostname: sources.hostname,
      organization: sources.organization,
      country: sources.country,
      totalMessages: sources.totalMessages,
    })
    .from(sources)
    .where(
      and(
        eq(sources.domainId, domainId),
        gte(sources.firstSeen, report.dateRangeBegin),
        isNull(sources.knownSenderId), // Not matched to a known sender
        gte(sources.totalMessages, MIN_MESSAGE_THRESHOLD) // Minimum volume threshold
      )
    );

  if (newSources.length === 0) return 0;

  // Check for recent alerts to avoid duplicates
  const dedupeTime = new Date(Date.now() - DEDUP_WINDOW_HOURS * 60 * 60 * 1000);
  const recentAlerts = await db
    .select({ metadata: alerts.metadata })
    .from(alerts)
    .where(
      and(
        eq(alerts.domainId, domainId),
        eq(alerts.type, 'new_source'),
        gte(alerts.createdAt, dedupeTime)
      )
    );

  // Extract IPs from recent alerts (handle both old single-IP and new multi-IP format)
  const recentlyAlertedIps = new Set<string>(
    recentAlerts.flatMap((a) => {
      const meta = a.metadata as Record<string, unknown> | null;
      if (!meta) return [];
      if (Array.isArray(meta.sourceIps)) return meta.sourceIps as string[];
      if (typeof meta.sourceIp === 'string') return [meta.sourceIp];
      return [];
    })
  );

  const newUnalertedSources = newSources.filter(
    (s) => !recentlyAlertedIps.has(s.sourceIp)
  );

  if (newUnalertedSources.length === 0) return 0;

  // Get domain name for the alert message
  const [domain] = await db
    .select({ domain: domains.domain })
    .from(domains)
    .where(eq(domains.id, domainId))
    .limit(1);

  const domainName = domain?.domain || 'your domain';

  // Create ONE consolidated alert instead of many individual ones
  const topSources = newUnalertedSources.slice(0, 5);
  const sourcesList = topSources
    .map((s) => `${s.sourceIp} (${s.organization || s.hostname || 'Unknown'})`)
    .join(', ');

  const suffix =
    newUnalertedSources.length > 5
      ? ` and ${newUnalertedSources.length - 5} more`
      : '';

  await createAlert({
    organizationId,
    domainId,
    type: 'new_source',
    severity: newUnalertedSources.length > 10 ? 'warning' : 'info',
    title: `${newUnalertedSources.length} new email source${newUnalertedSources.length > 1 ? 's' : ''} detected`,
    message: `New sources sending email for ${domainName}: ${sourcesList}${suffix}. Review and classify these sources.`,
    metadata: {
      sourceCount: newUnalertedSources.length,
      sourceIps: newUnalertedSources.map((s) => s.sourceIp),
      sources: newUnalertedSources.slice(0, 10).map((s) => ({
        ip: s.sourceIp,
        hostname: s.hostname,
        organization: s.organization,
        country: s.country,
        messages: Number(s.totalMessages),
      })),
    },
  });

  return 1; // Only 1 consolidated alert created now
}

async function triggerWebhooks(
  organizationId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<number> {
  // Find webhooks subscribed to this event
  const orgWebhooks = await db
    .select()
    .from(webhooks)
    .where(
      and(
        eq(webhooks.organizationId, organizationId),
        eq(webhooks.isActive, true)
      )
    );

  let triggered = 0;
  for (const webhook of orgWebhooks) {
    // Check if webhook is subscribed to this event
    const events = (Array.isArray(webhook.events) ? webhook.events : []) as string[];
    if (!events.includes(event) && !events.includes('*')) {
      continue;
    }

    // Queue webhook delivery
    const jobData: WebhookDeliveryJobData = {
      webhookId: webhook.id,
      event,
      payload,
    };

    await webhookDeliveryQueue.add(`webhook-${webhook.id}-${Date.now()}`, jobData);
    triggered++;
  }

  return triggered;
}

async function processReportImported(job: Job<AlertsJobData>): Promise<AlertsResult> {
  const { organizationId, domainId, reportId } = job.data;

  if (!domainId || !reportId) {
    return { alertsCreated: 0, notificationsSent: 0 };
  }

  console.log(`[Alerts] Processing report import for domain ${domainId}`);

  let alertsCreated = 0;
  const notificationsSent = 0;

  // Check pass rate
  const { current, previous } = await getRecentPassRates(domainId, reportId);

  if (previous > 0 && current < previous) {
    await checkPassRateAlert({
      organizationId,
      domainId,
      currentPassRate: current,
      previousPassRate: previous,
    });
    alertsCreated++;
  }

  // Check for new sources (now creates 1 consolidated alert if there are any)
  const newSourceAlertCreated = await checkForNewSources(organizationId, domainId, reportId);
  alertsCreated += newSourceAlertCreated;

  // Trigger webhooks for report imported event
  const [domain] = await db
    .select({ domain: domains.domain })
    .from(domains)
    .where(eq(domains.id, domainId));

  await triggerWebhooks(organizationId, 'report.imported', {
    reportId,
    domainId,
    domainName: domain?.domain,
    passRate: current,
    timestamp: new Date().toISOString(),
  });

  return { alertsCreated, notificationsSent };
}

async function processDnsChange(job: Job<AlertsJobData>): Promise<AlertsResult> {
  const { organizationId, domainId } = job.data;

  if (!domainId) {
    return { alertsCreated: 0, notificationsSent: 0 };
  }

  // DNS change alerts are created by the DNS check worker
  // This is just a placeholder for triggering webhooks

  const [domain] = await db
    .select({ domain: domains.domain })
    .from(domains)
    .where(eq(domains.id, domainId));

  await triggerWebhooks(organizationId, 'dns.changed', {
    domainId,
    domainName: domain?.domain,
    timestamp: new Date().toISOString(),
  });

  return { alertsCreated: 0, notificationsSent: 0 };
}

async function processScheduledCheck(job: Job<AlertsJobData>): Promise<AlertsResult> {
  // Scheduled check - could be used for periodic compliance reviews
  return { alertsCreated: 0, notificationsSent: 0 };
}

async function processJob(job: Job<AlertsJobData>): Promise<AlertsResult> {
  const { type } = job.data;

  switch (type) {
    case 'report_imported':
      return processReportImported(job);
    case 'dns_change':
      return processDnsChange(job);
    case 'scheduled_check':
      return processScheduledCheck(job);
    default:
      console.warn(`[Alerts] Unknown alert type: ${type}`);
      return { alertsCreated: 0, notificationsSent: 0 };
  }
}

// Create and export the worker
export function createAlertsWorker() {
  const worker = new Worker(QUEUE_NAMES.ALERTS, processJob, {
    connection: createRedisConnection(),
    concurrency: 10,
  });

  worker.on('completed', (job, result) => {
    console.log(`[Alerts Worker] Job ${job.id} completed:`, result);
  });

  worker.on('failed', (job, error) => {
    console.error(`[Alerts Worker] Job ${job?.id} failed:`, error);
  });

  return worker;
}
