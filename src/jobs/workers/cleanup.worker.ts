import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../redis';
import { QUEUE_NAMES } from '../queues';
import type { CleanupJobData, CleanupResult } from '../types';
import { db } from '@/db';
import {
  domains,
  reports,
  records,
  dkimResults,
  spfResults,
  sources,
  forensicReports,
  subdomains,
  organizations,
  sessions,
  dataExports,
  gmailAccounts,
} from '@/db/schema';
import { eq, and, lt, lte, isNull, isNotNull, sql, inArray } from 'drizzle-orm';
import { scheduleCleanupJobs } from '../scheduler';
import { sendVerificationLapseEmail } from '@/lib/email-service';

async function cleanupDataRetention(): Promise<number> {
  console.log('[Cleanup] Running data retention cleanup...');

  let deletedRecords = 0;

  // Get organizations with their retention settings
  const orgs = await db
    .select({
      id: organizations.id,
      dataRetentionDays: organizations.dataRetentionDays,
    })
    .from(organizations);

  for (const org of orgs) {
    const retentionDays = org.dataRetentionDays || 365;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Get domains for this org
    const orgDomains = await db
      .select({ id: domains.id })
      .from(domains)
      .where(eq(domains.organizationId, org.id));

    const domainIds = orgDomains.map((d) => d.id);

    if (domainIds.length === 0) continue;

    // Find old reports
    const oldReports = await db
      .select({ id: reports.id })
      .from(reports)
      .where(
        and(
          sql`${reports.domainId} = ANY(${domainIds})`,
          lt(reports.dateRangeEnd, cutoffDate)
        )
      );

    const reportIds = oldReports.map((r) => r.id);

    if (reportIds.length === 0) continue;

    // Delete in order: DKIM results -> SPF results -> records -> reports
    for (const reportId of reportIds) {
      // Get record IDs
      const reportRecords = await db
        .select({ id: records.id })
        .from(records)
        .where(eq(records.reportId, reportId));

      const recordIds = reportRecords.map((r) => r.id);

      // Delete DKIM and SPF results
      for (const recordId of recordIds) {
        await db.delete(dkimResults).where(eq(dkimResults.recordId, recordId));
        await db.delete(spfResults).where(eq(spfResults.recordId, recordId));
      }

      // Delete records
      await db.delete(records).where(eq(records.reportId, reportId));

      // Delete report
      await db.delete(reports).where(eq(reports.id, reportId));

      deletedRecords++;
    }

    // Delete old forensic reports
    await db
      .delete(forensicReports)
      .where(
        and(
          sql`${forensicReports.domainId} = ANY(${domainIds})`,
          lt(forensicReports.arrivalDate, cutoffDate)
        )
      );

    // Cleanup old sources (but keep the most recent ones)
    // Only delete sources not seen in retention period
    await db
      .delete(sources)
      .where(
        and(
          sql`${sources.domainId} = ANY(${domainIds})`,
          lt(sources.lastSeen, cutoffDate)
        )
      );
  }

  console.log(`[Cleanup] Deleted ${deletedRecords} old reports`);
  return deletedRecords;
}

async function cleanupUnverifiedDomains(): Promise<number> {
  console.log('[Cleanup] Cleaning up unverified domains...');

  // Delete domains that have been unverified for more than 7 days
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 7);

  const unverifiedDomains = await db
    .select({ id: domains.id })
    .from(domains)
    .where(
      and(
        isNull(domains.verifiedAt),
        lt(domains.createdAt, cutoffDate)
      )
    );

  const domainIds = unverifiedDomains.map((d) => d.id);

  if (domainIds.length === 0) {
    console.log('[Cleanup] No unverified domains to clean up');
    return 0;
  }

  // Delete related data first
  for (const domainId of domainIds) {
    // Delete subdomains
    await db.delete(subdomains).where(eq(subdomains.domainId, domainId));

    // Delete sources
    await db.delete(sources).where(eq(sources.domainId, domainId));

    // Delete forensic reports
    await db.delete(forensicReports).where(eq(forensicReports.domainId, domainId));

    // Get and delete reports with their children
    const domainReports = await db
      .select({ id: reports.id })
      .from(reports)
      .where(eq(reports.domainId, domainId));

    for (const report of domainReports) {
      const reportRecords = await db
        .select({ id: records.id })
        .from(records)
        .where(eq(records.reportId, report.id));

      for (const record of reportRecords) {
        await db.delete(dkimResults).where(eq(dkimResults.recordId, record.id));
        await db.delete(spfResults).where(eq(spfResults.recordId, record.id));
      }

      await db.delete(records).where(eq(records.reportId, report.id));
      await db.delete(reports).where(eq(reports.id, report.id));
    }

    // Finally delete the domain
    await db.delete(domains).where(eq(domains.id, domainId));
  }

  console.log(`[Cleanup] Deleted ${domainIds.length} unverified domains`);
  return domainIds.length;
}

async function cleanupExpiredSessions(): Promise<number> {
  console.log('[Cleanup] Cleaning up expired sessions...');

  const result = await db
    .delete(sessions)
    .where(lt(sessions.expires, new Date()))
    .returning({ id: sessions.sessionToken });

  console.log(`[Cleanup] Deleted ${result.length} expired sessions`);
  return result.length;
}

async function cleanupExpiredExports(): Promise<number> {
  console.log('[Cleanup] Cleaning up expired exports...');

  // Delete exports older than 7 days
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 7);

  const result = await db
    .delete(dataExports)
    .where(lt(dataExports.createdAt, cutoffDate))
    .returning({ id: dataExports.id });

  console.log(`[Cleanup] Deleted ${result.length} expired exports`);
  return result.length;
}

async function sendVerificationLapseNotifications(): Promise<number> {
  console.log('[Cleanup] Sending verification lapse notifications...');

  // Find domains with lapsed verification that haven't been notified yet
  const lapsedDomains = await db
    .select({
      id: domains.id,
      domain: domains.domain,
      organizationId: domains.organizationId,
      verificationToken: domains.verificationToken,
      verificationLapsedAt: domains.verificationLapsedAt,
    })
    .from(domains)
    .where(
      and(
        isNotNull(domains.verificationLapsedAt),
        isNull(domains.verificationLapseNotifiedAt)
      )
    );

  if (lapsedDomains.length === 0) {
    console.log('[Cleanup] No verification lapse notifications to send');
    return 0;
  }

  // Group domains by organization
  const domainsByOrg = new Map<string, typeof lapsedDomains>();
  for (const domain of lapsedDomains) {
    const orgDomains = domainsByOrg.get(domain.organizationId) || [];
    orgDomains.push(domain);
    domainsByOrg.set(domain.organizationId, orgDomains);
  }

  let notificationsSent = 0;

  for (const [organizationId, orgDomains] of domainsByOrg) {
    // Check if org has verification lapse notifications enabled
    const [gmailAccount] = await db
      .select({
        notifyVerificationLapse: gmailAccounts.notifyVerificationLapse,
        sendEnabled: gmailAccounts.sendEnabled,
      })
      .from(gmailAccounts)
      .where(
        and(
          eq(gmailAccounts.organizationId, organizationId),
          eq(gmailAccounts.sendEnabled, true)
        )
      )
      .limit(1);

    if (!gmailAccount || !gmailAccount.notifyVerificationLapse) {
      console.log(`[Cleanup] Verification lapse notifications disabled for org ${organizationId}`);
      // Still mark as notified so we don't keep checking
      const domainIds = orgDomains.map(d => d.id);
      await db
        .update(domains)
        .set({ verificationLapseNotifiedAt: new Date() })
        .where(inArray(domains.id, domainIds));
      continue;
    }

    // Send aggregate email
    const domainsForEmail = orgDomains.map(d => ({
      domain: d.domain,
      domainId: d.id,
      verificationToken: d.verificationToken!,
      lapsedAt: d.verificationLapsedAt!,
    }));

    try {
      const result = await sendVerificationLapseEmail({
        organizationId,
        domains: domainsForEmail,
      });

      if (result.success) {
        console.log(`[Cleanup] Sent verification lapse email for org ${organizationId} (${orgDomains.length} domains)`);
        notificationsSent++;
      } else {
        console.error(`[Cleanup] Failed to send verification lapse email: ${result.error}`);
      }
    } catch (error) {
      console.error(`[Cleanup] Error sending verification lapse email:`, error);
    }

    // Mark domains as notified (even if email failed - to prevent spam)
    const domainIds = orgDomains.map(d => d.id);
    await db
      .update(domains)
      .set({ verificationLapseNotifiedAt: new Date() })
      .where(inArray(domains.id, domainIds));
  }

  console.log(`[Cleanup] Sent ${notificationsSent} verification lapse notification emails`);
  return notificationsSent;
}

async function processCleanup(job: Job<CleanupJobData>): Promise<CleanupResult> {
  const { type, organizationId } = job.data;

  const result: CleanupResult = {
    deletedRecords: 0,
    deletedDomains: 0,
    deletedSessions: 0,
    deletedExports: 0,
  };

  switch (type) {
    case 'data_retention':
      result.deletedRecords = await cleanupDataRetention();
      break;

    case 'unverified_domains':
      result.deletedDomains = await cleanupUnverifiedDomains();
      break;

    case 'expired_sessions':
      result.deletedSessions = await cleanupExpiredSessions();
      break;

    case 'expired_exports':
      result.deletedExports = await cleanupExpiredExports();
      break;

    case 'verification_lapse_notifications':
      await sendVerificationLapseNotifications();
      break;

    default:
      console.warn(`[Cleanup] Unknown cleanup type: ${type}`);
  }

  return result;
}

// Handle scheduled trigger vs direct cleanup
async function processJob(job: Job<CleanupJobData | { type: string }>): Promise<CleanupResult> {
  // Check if this is a scheduler trigger
  if ('type' in job.data && job.data.type === 'scheduled') {
    console.log('[Cleanup] Scheduler triggered - running all cleanup jobs');
    await scheduleCleanupJobs();
    return { deletedRecords: 0, deletedDomains: 0, deletedSessions: 0, deletedExports: 0 };
  }

  return processCleanup(job as Job<CleanupJobData>);
}

// Create and export the worker
export function createCleanupWorker() {
  const worker = new Worker(QUEUE_NAMES.CLEANUP, processJob, {
    connection: createRedisConnection(),
    concurrency: 1, // Run one cleanup at a time
  });

  worker.on('completed', (job, result) => {
    console.log(`[Cleanup Worker] Job ${job.id} completed:`, result);
  });

  worker.on('failed', (job, error) => {
    console.error(`[Cleanup Worker] Job ${job?.id} failed:`, error);
  });

  return worker;
}
