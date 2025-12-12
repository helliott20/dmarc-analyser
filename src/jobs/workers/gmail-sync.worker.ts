import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../redis';
import { QUEUE_NAMES, alertsQueue, ipEnrichmentQueue } from '../queues';
import type { GmailSyncJobData, GmailSyncResult, AlertsJobData, IpEnrichmentJobData } from '../types';
import { db } from '@/db';
import { gmailAccounts, domains, sources, knownSenders, orgMembers, users } from '@/db/schema';
import { eq, and, isNull, or } from 'drizzle-orm';
import { discoverDomainsFromGmail } from '@/lib/domain-discovery';
import { sendDomainDiscoveryEmail } from '@/lib/email-service';
import { autoMatchSource } from '@/lib/known-sender-matcher';
import {
  getValidAccessToken,
  searchDmarcEmails,
  getMessage,
  getAttachment,
  extractDmarcAttachments,
  archiveMessage,
} from '@/lib/gmail';
import { importDmarcReport } from '@/lib/report-importer';
import AdmZip from 'adm-zip';
import { gunzipSync } from 'zlib';
import { scheduleGmailSyncJobs } from '../scheduler';

const CONCURRENCY = 1; // Process 1 email at a time (avoid Gmail rate limits)
const DELAY_BETWEEN_EMAILS_MS = 100; // 100ms delay + ~200ms API calls = ~3 emails/sec (180/min, 3600 units/min)

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

      // Track stats for this batch
      let skippedReports = 0;
      let noAttachments = 0;
      let domainMismatch = 0;

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

          let emailStatus = 'no-attachment';
          let emailDomain = '';

          if (attachments.length === 0) {
            noAttachments++;
          }

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
              emailDomain = reportDomain;
              const domainId = domainMap.get(reportDomain);
              if (!domainId) {
                domainMismatch++;
                emailStatus = 'domain-mismatch';
                continue;
              }

              const importResult = await importDmarcReport(xmlContent, domainId, messageId);

              if (importResult.success) {
                if (importResult.skipped) {
                  skippedReports++;
                  emailStatus = 'skipped';
                } else {
                  reportsFoundInMessage++;
                  emailStatus = 'imported';
                  // Queue follow-up jobs (don't await - fire and forget)
                  queueIpEnrichmentForNewSources(domainId).catch(() => {});
                  autoMatchNewSources(domainId, organizationId).catch(() => {});
                  alertsQueue.add(`alert-${importResult.reportId}`, {
                    type: 'report_imported',
                    domainId,
                    reportId: importResult.reportId,
                    organizationId,
                  } as AlertsJobData).catch(() => {});
                }
              } else if (importResult.error) {
                emailStatus = 'error';
                result.errors.push(`Report import failed: ${importResult.error}`);
              }
            } catch (attachmentError) {
              emailStatus = 'error';
              const errorMsg = attachmentError instanceof Error ? attachmentError.message : 'Unknown error';
              result.errors.push(`Attachment error: ${errorMsg}`);
            }
          }

          // One line per email
          console.log(`[Gmail Sync] ${emailStatus.toUpperCase()}${emailDomain ? `: ${emailDomain}` : ''}`);

          // Archive processed messages (removes from inbox to prevent re-processing)
          try {
            await archiveMessage(accessToken, messageId);
          } catch (err) {
            console.warn(`[Gmail Sync] Failed to archive message ${messageId}:`, err);
          }

          // Rate limit delay
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_EMAILS_MS));

          return { processed: 1, reports: reportsFoundInMessage };
        } catch (messageError) {
          const errorMsg = messageError instanceof Error ? messageError.message : 'Unknown error';
          result.errors.push(`Message error: ${errorMsg}`);
          return { processed: 1, reports: 0 };
        }
      };

      // Process emails sequentially and update DB every 10 emails
      let batchNewReports = 0;
      let emailsInBatch = 0;

      for (const messageId of searchResult.messageIds) {
        // Check if cancelled
        if (await isCancelled(gmailAccountId)) {
          console.log(`[Gmail Sync] Sync cancelled for account ${gmailAccountId}`);
          return result;
        }

        const r = await processMessage(messageId);
        result.emailsProcessed += r.processed;
        result.reportsFound += r.reports;
        batchNewReports += r.reports;
        emailsInBatch++;

        // Update database every 10 emails for live UI updates
        if (emailsInBatch % 10 === 0) {
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
        }
      }

      // Log batch summary
      console.log(`[Gmail Sync] Batch: ${searchResult.messageIds.length} emails | New: ${batchNewReports} | Skipped (already in DB): ${skippedReports} | No attachments: ${noAttachments} | Domain mismatch: ${domainMismatch}`);

      // Update progress after batch
      await job.updateProgress({
        emailsProcessed: result.emailsProcessed,
        reportsFound: result.reportsFound,
      });

      hasMore = searchResult.hasMore;
      pageToken = searchResult.nextPageToken;

      // Final DB update for this batch
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

    // Run domain discovery after successful sync
    discoverAndNotifyNewDomains(gmailAccountId, organizationId).catch((err) => {
      console.error('[Gmail Sync] Domain discovery failed:', err);
    });

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

async function discoverAndNotifyNewDomains(gmailAccountId: string, organizationId: string) {
  try {
    // Check if notifications are enabled for this account
    const [account] = await db
      .select({ notifyNewDomains: gmailAccounts.notifyNewDomains })
      .from(gmailAccounts)
      .where(eq(gmailAccounts.id, gmailAccountId));

    // Discover domains from Gmail
    const discovery = await discoverDomainsFromGmail(gmailAccountId, organizationId);

    if (discovery.suggestions.length === 0) {
      return;
    }

    console.log(`[Gmail Sync] Discovered ${discovery.suggestions.length} new domains`);

    // Only send email if notifications are enabled
    if (account?.notifyNewDomains) {
      // Get org owner emails for notification
      const admins = await db
        .select({ email: users.email })
        .from(orgMembers)
        .innerJoin(users, eq(orgMembers.userId, users.id))
        .where(
          and(
            eq(orgMembers.organizationId, organizationId),
            eq(orgMembers.role, 'owner')
          )
        );

      const recipients = admins.map(a => a.email).filter((e): e is string => !!e);

      if (recipients.length > 0) {
        await sendDomainDiscoveryEmail({
          organizationId,
          recipients,
          domains: discovery.suggestions,
        });
        console.log(`[Gmail Sync] Sent domain discovery email to ${recipients.length} recipients`);
      }
    }
  } catch (error) {
    console.error('[Gmail Sync] Domain discovery error:', error);
  }
}

async function autoMatchNewSources(domainId: string, organizationId: string) {
  // Find sources without a known sender assigned
  const unmatchedSources = await db
    .select({ id: sources.id })
    .from(sources)
    .where(
      and(
        eq(sources.domainId, domainId),
        isNull(sources.knownSenderId)
      )
    )
    .limit(100); // Limit to avoid long processing

  let matched = 0;
  for (const source of unmatchedSources) {
    const match = await autoMatchSource(source.id, organizationId);
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

  if (matched > 0) {
    console.log(`[Gmail Sync] Auto-matched ${matched} sources to known senders`);
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
