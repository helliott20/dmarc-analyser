import { db } from '@/db';
import { gmailAccounts, domains, scheduledReports } from '@/db/schema';
import { eq, and, lte, isNotNull } from 'drizzle-orm';
import {
  gmailSyncQueue,
  dnsCheckQueue,
  scheduledReportsQueue,
  cleanupQueue,
} from './queues';
import type {
  GmailSyncJobData,
  DnsCheckJobData,
  ScheduledReportJobData,
  CleanupJobData,
} from './types';

// Schedule Gmail sync for all connected accounts (every 15 minutes)
export async function scheduleGmailSyncJobs() {
  console.log('[Scheduler] Scheduling Gmail sync jobs...');

  const accounts = await db
    .select({
      id: gmailAccounts.id,
      organizationId: gmailAccounts.organizationId,
    })
    .from(gmailAccounts)
    .where(
      and(
        isNotNull(gmailAccounts.accessToken),
        eq(gmailAccounts.syncEnabled, true)
      )
    );

  let scheduled = 0;
  let skipped = 0;

  for (const account of accounts) {
    const jobId = `gmail-sync-${account.id}`;

    // Check if a job for this account is already in the queue or active
    const existingJob = await gmailSyncQueue.getJob(jobId);

    if (existingJob) {
      const state = await existingJob.getState();
      if (state === 'active' || state === 'waiting' || state === 'delayed') {
        console.log(`[Scheduler] Skipping ${account.id} - job already ${state}`);
        skipped++;
        continue;
      }
      // Job exists but is completed/failed - remove it so we can add a new one
      await existingJob.remove();
    }

    const jobData: GmailSyncJobData = {
      gmailAccountId: account.id,
      organizationId: account.organizationId,
    };

    await gmailSyncQueue.add(
      `gmail-sync-${account.id}`,
      jobData,
      {
        jobId: jobId, // Use stable ID without timestamp
      }
    );
    scheduled++;
  }

  console.log(`[Scheduler] Gmail sync: ${scheduled} scheduled, ${skipped} skipped (already running)`);
  return scheduled;
}

// Schedule DNS checks for all verified domains (every 6 hours)
export async function scheduleDnsCheckJobs() {
  console.log('[Scheduler] Scheduling DNS check jobs...');

  const verifiedDomains = await db
    .select({
      id: domains.id,
      organizationId: domains.organizationId,
    })
    .from(domains)
    .where(isNotNull(domains.verifiedAt));

  let scheduled = 0;
  let skipped = 0;

  for (const domain of verifiedDomains) {
    const jobId = `dns-check-${domain.id}`;

    // Check if a job for this domain is already in the queue or active
    const existingJob = await dnsCheckQueue.getJob(jobId);

    if (existingJob) {
      const state = await existingJob.getState();
      if (state === 'active' || state === 'waiting' || state === 'delayed') {
        console.log(`[Scheduler] Skipping DNS check for ${domain.id} - job already ${state}`);
        skipped++;
        continue;
      }
      // Job exists but is completed/failed - remove it so we can add a new one
      await existingJob.remove();
    }

    const jobData: DnsCheckJobData = {
      domainId: domain.id,
      organizationId: domain.organizationId,
    };

    await dnsCheckQueue.add(
      `dns-check-${domain.id}`,
      jobData,
      {
        jobId: jobId, // Use stable ID without timestamp
      }
    );
    scheduled++;
  }

  console.log(`[Scheduler] DNS check: ${scheduled} scheduled, ${skipped} skipped (already running)`);
  return scheduled;
}

// Schedule reports that are due to run
export async function scheduleScheduledReportJobs() {
  console.log('[Scheduler] Scheduling report jobs...');

  const now = new Date();

  const dueReports = await db
    .select({
      id: scheduledReports.id,
      organizationId: scheduledReports.organizationId,
    })
    .from(scheduledReports)
    .where(
      and(
        eq(scheduledReports.isActive, true),
        lte(scheduledReports.nextRunAt, now)
      )
    );

  for (const report of dueReports) {
    const jobData: ScheduledReportJobData = {
      scheduledReportId: report.id,
      organizationId: report.organizationId,
    };

    await scheduledReportsQueue.add(
      `scheduled-report-${report.id}`,
      jobData,
      {
        jobId: `scheduled-report-${report.id}-${Date.now()}`,
      }
    );
  }

  console.log(`[Scheduler] Scheduled ${dueReports.length} report jobs`);
  return dueReports.length;
}

// Schedule cleanup jobs (daily at 2am)
export async function scheduleCleanupJobs() {
  console.log('[Scheduler] Scheduling cleanup jobs...');

  const cleanupTypes: CleanupJobData['type'][] = [
    'data_retention',
    'unverified_domains',
    'expired_sessions',
    'expired_exports',
  ];

  for (const type of cleanupTypes) {
    const jobData: CleanupJobData = { type };

    await cleanupQueue.add(
      `cleanup-${type}`,
      jobData,
      {
        jobId: `cleanup-${type}-${Date.now()}`,
      }
    );
  }

  console.log(`[Scheduler] Scheduled ${cleanupTypes.length} cleanup jobs`);
  return cleanupTypes.length;
}

// Add repeatable jobs using BullMQ's built-in repeat functionality
export async function setupRepeatableJobs() {
  console.log('[Scheduler] Setting up repeatable jobs...');

  // Gmail sync - every 15 minutes
  // Note: Don't use jobId with repeat - BullMQ creates its own keys for repeatable jobs
  await gmailSyncQueue.add(
    'gmail-sync-scheduler',
    { type: 'scheduled' },
    {
      repeat: {
        pattern: '*/15 * * * *', // Every 15 minutes
      },
    }
  );
  console.log('[Scheduler] Added Gmail sync (every 15 min)');

  // DNS check - every 6 hours
  await dnsCheckQueue.add(
    'dns-check-scheduler',
    { type: 'scheduled' },
    {
      repeat: {
        pattern: '0 */6 * * *', // Every 6 hours
      },
    }
  );
  console.log('[Scheduler] Added DNS check (every 6 hours)');

  // Scheduled reports - every hour (checks for due reports)
  await scheduledReportsQueue.add(
    'scheduled-reports-scheduler',
    { type: 'scheduled' },
    {
      repeat: {
        pattern: '0 * * * *', // Every hour
      },
    }
  );
  console.log('[Scheduler] Added Scheduled reports (every hour)');

  // Cleanup - daily at 2am
  await cleanupQueue.add(
    'cleanup-scheduler',
    { type: 'scheduled' },
    {
      repeat: {
        pattern: '0 2 * * *', // Daily at 2am
      },
    }
  );
  console.log('[Scheduler] Added Cleanup (daily at 2am)');

  console.log('[Scheduler] Repeatable jobs configured');
}

// Remove all repeatable jobs (for cleanup/restart)
export async function removeRepeatableJobs() {
  const queuesWithRepeat = [
    gmailSyncQueue,
    dnsCheckQueue,
    scheduledReportsQueue,
    cleanupQueue,
  ];

  for (const queue of queuesWithRepeat) {
    const repeatableJobs = await queue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await queue.removeRepeatableByKey(job.key);
    }
  }

  console.log('[Scheduler] Removed all repeatable jobs');
}
