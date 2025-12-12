import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../redis';
import { QUEUE_NAMES, alertsQueue, ipEnrichmentQueue } from '../queues';
import type { GmailSyncJobData, GmailSyncResult, AlertsJobData, IpEnrichmentJobData } from '../types';
import { db } from '@/db';
import { gmailAccounts, domains, sources } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import {
  getValidAccessToken,
  searchDmarcEmails,
  getMessage,
  getAttachment,
  extractDmarcAttachments,
  archiveMessage,
  createLabel,
} from '@/lib/gmail';
import { importDmarcReport } from '@/lib/report-importer';
import AdmZip from 'adm-zip';
import { gunzipSync } from 'zlib';
import { scheduleGmailSyncJobs } from '../scheduler';

const DMARC_LABEL = 'DMARC-Processed';
const CONCURRENCY = 5; // Process 5 emails at a time

// Cancellation check with caching to avoid too many DB queries
const cancellationCache = new Map<string, { cancelled: boolean; checkedAt: number }>();
const CANCELLATION_CHECK_INTERVAL = 3000; // Check every 3 seconds max

async function isCancelled(gmailAccountId: string): Promise<boolean> {
  const now = Date.now();
  const cached = cancellationCache.get(gmailAccountId);

  // Return cached value if checked recently
  if (cached && now - cached.checkedAt < CANCELLATION_CHECK_INTERVAL) {
    return cached.cancelled;
  }

  // Check database
  const [account] = await db
    .select({ syncStatus: gmailAccounts.syncStatus })
    .from(gmailAccounts)
    .where(eq(gmailAccounts.id, gmailAccountId));

  const cancelled = !account || account.syncStatus !== 'syncing';
  cancellationCache.set(gmailAccountId, { cancelled, checkedAt: now });

  return cancelled;
}

// Clear cancellation cache when sync starts
function clearCancellationCache(gmailAccountId: string) {
  cancellationCache.delete(gmailAccountId);
}

// Helper to process items with concurrency limit
async function processWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

async function processGmailSync(job: Job<GmailSyncJobData>): Promise<GmailSyncResult> {
  const { gmailAccountId, organizationId, fullSync } = job.data;

  console.log(`[Gmail Sync] Starting sync for account ${gmailAccountId}`);

  // Clear any stale cancellation cache
  clearCancellationCache(gmailAccountId);

  const result: GmailSyncResult = {
    emailsProcessed: 0,
    reportsFound: 0,
    errors: [],
  };

  // Mark sync as started in database
  await db
    .update(gmailAccounts)
    .set({
      syncStatus: 'syncing',
      syncProgress: {
        emailsProcessed: 0,
        reportsFound: 0,
        errors: 0,
        startedAt: new Date().toISOString(),
      },
      updatedAt: new Date(),
    })
    .where(eq(gmailAccounts.id, gmailAccountId));

  try {
    // Get access token
    const accessToken = await getValidAccessToken(gmailAccountId);

    // Get domains for this organization
    const orgDomains = await db
      .select({ id: domains.id, domain: domains.domain })
      .from(domains)
      .where(eq(domains.organizationId, organizationId));

    if (orgDomains.length === 0) {
      console.log(`[Gmail Sync] No domains found for organization ${organizationId}`);
      return result;
    }

    const domainNames = orgDomains.map((d) => d.domain);
    const domainMap = new Map(orgDomains.map((d) => [d.domain.toLowerCase(), d.id]));

    // Create or get the processed label - this is required to avoid re-processing
    let labelId: string;
    try {
      labelId = await createLabel(accessToken, DMARC_LABEL);
      console.log(`[Gmail Sync] Using label: ${DMARC_LABEL} (${labelId})`);
    } catch (error) {
      console.error('[Gmail Sync] Could not create/get label:', error);
      throw new Error('Failed to create DMARC-Processed label - cannot proceed without it');
    }

    // Search for DMARC emails
    const searchOptions = {
      domains: domainNames,
      maxResults: 100,
      searchAll: fullSync,
    };

    let pageToken: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const searchResult = await searchDmarcEmails(accessToken, {
        ...searchOptions,
        pageToken,
      });

      // Process messages in parallel batches
      const processMessage = async (messageId: string) => {
        // Quick cancellation check before processing each message
        if (await isCancelled(gmailAccountId)) {
          return { processed: 0, reports: 0 };
        }

        try {
          const message = await getMessage(accessToken, messageId);
          const attachments = extractDmarcAttachments(message);
          let reportsFoundInMessage = 0;

          for (const attachment of attachments) {
            try {
              if (!attachment.body.attachmentId) continue;

              // Download attachment
              const attachmentData = await getAttachment(
                accessToken,
                messageId,
                attachment.body.attachmentId
              );

              // Decode base64url
              const buffer = Buffer.from(
                attachmentData.replace(/-/g, '+').replace(/_/g, '/'),
                'base64'
              );

              // Extract XML content
              let xmlContent: string | null = null;
              const filename = attachment.filename?.toLowerCase() || '';

              if (filename.endsWith('.zip')) {
                const zip = new AdmZip(buffer);
                const entries = zip.getEntries();
                for (const entry of entries) {
                  if (entry.entryName.endsWith('.xml')) {
                    xmlContent = entry.getData().toString('utf8');
                    break;
                  }
                }
              } else if (filename.endsWith('.gz')) {
                const decompressed = gunzipSync(buffer);
                xmlContent = decompressed.toString('utf8');
              } else if (filename.endsWith('.xml')) {
                xmlContent = buffer.toString('utf8');
              }

              if (!xmlContent) continue;

              const domainMatch = xmlContent.match(/<domain>([^<]+)<\/domain>/);
              if (!domainMatch) continue;

              const reportDomain = domainMatch[1].toLowerCase();
              const domainId = domainMap.get(reportDomain);
              if (!domainId) continue;

              const importResult = await importDmarcReport(xmlContent, domainId, messageId);

              if (importResult.success) {
                reportsFoundInMessage++;
                if (importResult.reportId && !importResult.skipped) {
                  // Queue follow-up jobs (don't await - fire and forget)
                  queueIpEnrichmentForNewSources(domainId).catch(() => {});
                  alertsQueue.add(`alert-${importResult.reportId}`, {
                    type: 'report_imported',
                    domainId,
                    reportId: importResult.reportId,
                    organizationId,
                  } as AlertsJobData).catch(() => {});
                }
              } else if (importResult.error) {
                result.errors.push(`Report import failed: ${importResult.error}`);
              }
            } catch (attachmentError) {
              const errorMsg = attachmentError instanceof Error ? attachmentError.message : 'Unknown error';
              result.errors.push(`Attachment error: ${errorMsg}`);
            }
          }

          // Always archive and label processed messages (even if no reports found)
          // This prevents re-processing the same email
          if (labelId) {
            archiveMessage(accessToken, messageId, labelId).catch((err) => {
              console.warn(`[Gmail Sync] Failed to archive message ${messageId}:`, err);
            });
          }

          return { processed: 1, reports: reportsFoundInMessage };
        } catch (messageError) {
          const errorMsg = messageError instanceof Error ? messageError.message : 'Unknown error';
          result.errors.push(`Message error: ${errorMsg}`);
          return { processed: 1, reports: 0 };
        }
      };

      // Process batch with concurrency
      const batchResults = await processWithConcurrency(
        searchResult.messageIds,
        processMessage,
        CONCURRENCY
      );

      // Aggregate results
      for (const r of batchResults) {
        result.emailsProcessed += r.processed;
        result.reportsFound += r.reports;
      }

      // Update progress after each batch
      await job.updateProgress({
        emailsProcessed: result.emailsProcessed,
        reportsFound: result.reportsFound,
      });

      hasMore = searchResult.hasMore;
      pageToken = searchResult.nextPageToken;

      // Check if cancelled before updating progress
      if (await isCancelled(gmailAccountId)) {
        console.log(`[Gmail Sync] Sync cancelled for account ${gmailAccountId}`);
        return result; // Return current progress, don't update status (already set to idle by cancel)
      }

      // Update progress to database every batch for UI visibility
      await db
        .update(gmailAccounts)
        .set({
          syncStatus: 'syncing',
          syncProgress: {
            emailsProcessed: result.emailsProcessed,
            reportsFound: result.reportsFound,
            errors: result.errors.length,
            lastBatchAt: new Date().toISOString(),
          },
          updatedAt: new Date(),
        })
        .where(eq(gmailAccounts.id, gmailAccountId));

      // Limit for safety but allow much larger imports (2000 emails)
      if (result.emailsProcessed >= 2000) {
        console.log('[Gmail Sync] Reached max emails limit for this sync cycle');
        break;
      }
    }

    // Update completion status
    await db
      .update(gmailAccounts)
      .set({
        lastSyncAt: new Date(),
        syncStatus: 'idle',
        syncProgress: {
          emailsProcessed: result.emailsProcessed,
          reportsFound: result.reportsFound,
          errors: result.errors.length,
          completedAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(eq(gmailAccounts.id, gmailAccountId));

    console.log(`[Gmail Sync] Completed: ${result.emailsProcessed} emails, ${result.reportsFound} reports`);
    return result;
  } catch (error) {
    console.error('[Gmail Sync] Fatal error:', error);

    // Mark sync as failed in database
    await db
      .update(gmailAccounts)
      .set({
        syncStatus: 'idle',
        syncProgress: {
          emailsProcessed: result.emailsProcessed,
          reportsFound: result.reportsFound,
          errors: result.errors.length + 1,
          error: error instanceof Error ? error.message : 'Unknown error',
          failedAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(eq(gmailAccounts.id, gmailAccountId));

    throw error;
  }
}

async function queueIpEnrichmentForNewSources(domainId: string) {
  // Find sources without geolocation data
  const unenrichedSources = await db
    .select({ id: sources.id, sourceIp: sources.sourceIp })
    .from(sources)
    .where(
      and(
        eq(sources.domainId, domainId),
        isNull(sources.country)
      )
    )
    .limit(50); // Limit to avoid overloading the queue

  for (const source of unenrichedSources) {
    const jobData: IpEnrichmentJobData = {
      sourceId: source.id,
      ipAddress: source.sourceIp,
    };
    await ipEnrichmentQueue.add(`enrich-${source.id}`, jobData);
  }
}

// Handle scheduled trigger vs direct sync
async function processJob(job: Job<GmailSyncJobData | { type: string }>): Promise<GmailSyncResult> {
  // Check if this is a scheduler trigger
  if ('type' in job.data && job.data.type === 'scheduled') {
    console.log('[Gmail Sync] Scheduler triggered - scheduling all account syncs');
    await scheduleGmailSyncJobs();
    return { emailsProcessed: 0, reportsFound: 0, errors: [] };
  }

  // Direct sync for specific account
  return processGmailSync(job as Job<GmailSyncJobData>);
}

// Create and export the worker
export function createGmailSyncWorker() {
  const worker = new Worker(QUEUE_NAMES.GMAIL_SYNC, processJob, {
    connection: createRedisConnection(),
    concurrency: 1, // Process 1 account at a time to prevent overlap and rate limiting
    // Extended lock settings for long-running Gmail syncs (can take 30+ minutes for large imports)
    lockDuration: 300000, // 5 minutes - job must update progress within this time
    lockRenewTime: 60000, // Renew lock every 60 seconds while processing
  });

  worker.on('completed', (job, result) => {
    console.log(`[Gmail Sync Worker] Job ${job.id} completed:`, {
      emailsProcessed: result?.emailsProcessed || 0,
      reportsFound: result?.reportsFound || 0,
      errors: result?.errors?.length || 0,
    });
  });

  worker.on('failed', (job, error) => {
    console.error(`[Gmail Sync Worker] Job ${job?.id} failed:`, error);
  });

  worker.on('stalled', (jobId, prev) => {
    console.warn(`[Gmail Sync Worker] Job ${jobId} stalled (was ${prev}). This may indicate the job took too long without updating progress.`);
  });

  worker.on('error', (error) => {
    console.error('[Gmail Sync Worker] Worker error:', error);
  });

  return worker;
}
