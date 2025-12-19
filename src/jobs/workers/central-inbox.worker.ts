import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../redis';
import { QUEUE_NAMES, alertsQueue, ipEnrichmentQueue } from '../queues';
import type { CentralInboxJobData, CentralInboxResult, AlertsJobData, IpEnrichmentJobData } from '../types';
import { db } from '@/db';
import { domains, sources } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { syncCentralInbox, isCentralInboxConfigured } from '@/lib/central-inbox';
import { autoMatchSource } from '@/lib/known-sender-matcher';

/**
 * Central Inbox Worker
 *
 * Syncs the central reports@dmarcanalyser.io mailbox every 15 minutes.
 * Routes DMARC reports to the correct domain based on XML parsing.
 *
 * This replaces per-user Gmail OAuth for organizations that don't configure BYOC.
 */

async function processCentralInbox(job: Job<CentralInboxJobData>): Promise<CentralInboxResult> {
  const { fullSync = false } = job.data;

  console.log('[Central Inbox Worker] Starting sync...');

  if (!isCentralInboxConfigured()) {
    console.warn('[Central Inbox Worker] Central inbox not configured - skipping');
    return {
      emailsProcessed: 0,
      reportsFound: 0,
      domainsMatched: 0,
      errors: ['Central inbox not configured'],
    };
  }

  try {
    const result = await syncCentralInbox({ fullSync });

    // Queue follow-up jobs for all domains that received new reports
    // Note: This is a simplified version - in production you might want to
    // track which specific domains received reports and only queue for those
    if (result.reportsFound > 0) {
      await queueFollowUpJobs();
    }

    return result;
  } catch (error) {
    console.error('[Central Inbox Worker] Sync failed:', error);
    throw error;
  }
}

/**
 * Queue IP enrichment and auto-matching jobs for sources without geo data
 */
async function queueFollowUpJobs() {
  // Find sources without geolocation data (recently added)
  const unenrichedSources = await db
    .select({
      id: sources.id,
      sourceIp: sources.sourceIp,
      domainId: sources.domainId,
    })
    .from(sources)
    .where(isNull(sources.country))
    .limit(100);

  console.log(`[Central Inbox Worker] Queueing ${unenrichedSources.length} sources for enrichment`);

  for (const source of unenrichedSources) {
    const jobData: IpEnrichmentJobData = {
      sourceId: source.id,
      ipAddress: source.sourceIp,
    };
    await ipEnrichmentQueue.add(`enrich-${source.id}`, jobData).catch(() => {});
  }

  // Auto-match unmatched sources to known senders
  const unmatchedSources = await db
    .select({
      id: sources.id,
      domainId: sources.domainId,
    })
    .from(sources)
    .innerJoin(domains, eq(sources.domainId, domains.id))
    .where(isNull(sources.knownSenderId))
    .limit(100);

  let matched = 0;
  for (const source of unmatchedSources) {
    // Get the organization ID for this domain
    const [domain] = await db
      .select({ organizationId: domains.organizationId })
      .from(domains)
      .where(eq(domains.id, source.domainId));

    if (domain) {
      const match = await autoMatchSource(source.id, domain.organizationId);
      if (match) {
        await db
          .update(sources)
          .set({
            knownSenderId: match.id,
            updatedAt: new Date(),
          })
          .where(eq(sources.id, source.id));
        matched++;
      }
    }
  }

  if (matched > 0) {
    console.log(`[Central Inbox Worker] Auto-matched ${matched} sources to known senders`);
  }
}

// Handle scheduled trigger vs direct sync
async function processJob(job: Job<CentralInboxJobData>): Promise<CentralInboxResult> {
  // Check if this is a scheduler trigger
  if (job.data.type === 'scheduled') {
    console.log('[Central Inbox Worker] Scheduler triggered');
    return processCentralInbox(job);
  }

  // Direct/manual sync
  return processCentralInbox(job);
}

// Create and export the worker
export function createCentralInboxWorker() {
  const worker = new Worker(QUEUE_NAMES.CENTRAL_INBOX, processJob, {
    connection: createRedisConnection(),
    concurrency: 1, // Process 1 sync at a time
    lockDuration: 300000, // 5 minutes
    lockRenewTime: 60000, // Renew every 60 seconds
  });

  worker.on('completed', (job, result) => {
    console.log(`[Central Inbox Worker] Job ${job.id} completed:`, {
      emailsProcessed: result?.emailsProcessed || 0,
      reportsFound: result?.reportsFound || 0,
      domainsMatched: result?.domainsMatched || 0,
      errors: result?.errors?.length || 0,
    });
  });

  worker.on('failed', (job, error) => {
    console.error(`[Central Inbox Worker] Job ${job?.id} failed:`, error);
  });

  worker.on('stalled', (jobId, prev) => {
    console.warn(`[Central Inbox Worker] Job ${jobId} stalled (was ${prev}).`);
  });

  worker.on('error', (error) => {
    console.error('[Central Inbox Worker] Worker error:', error);
  });

  return worker;
}
