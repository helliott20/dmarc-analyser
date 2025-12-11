import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, gmailAccounts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { queues } from '@/jobs/queues';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

interface FailedJob {
  id: string;
  name: string;
  failedReason: string;
  timestamp: number;
  attemptsMade: number;
}

interface CompletedJobInfo {
  id: string;
  name: string;
  timestamp: number;
  returnvalue?: unknown;
}

interface QueueStatus {
  name: string;
  displayName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
  repeatableJobs: Array<{
    key: string;
    name: string;
    pattern: string;
    next: number | null;
  }>;
  recentFailedJobs: FailedJob[];
  lastCompletedJob: CompletedJobInfo | null;
}

async function getOrgAndCheckAccess(slug: string, userId: string) {
  const [result] = await db
    .select({
      organization: organizations,
      role: orgMembers.role,
    })
    .from(organizations)
    .innerJoin(orgMembers, eq(organizations.id, orgMembers.organizationId))
    .where(and(eq(organizations.slug, slug), eq(orgMembers.userId, userId)));

  return result;
}

// Get status for a queue using the shared queue instance
async function getQueueStatus(queue: typeof queues[keyof typeof queues], displayName: string): Promise<QueueStatus> {
  // Get all job counts - use getJobCounts for more reliable results
  const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');

  const [isPaused, repeatableJobs, failedJobs, completedJobs] = await Promise.all([
    queue.isPaused(),
    queue.getRepeatableJobs(),
    queue.getFailed(0, 5), // Get last 5 failed jobs
    queue.getCompleted(0, 1), // Get last completed job
  ]);

  // Map failed jobs to our interface
  const recentFailedJobs: FailedJob[] = failedJobs.map((job) => ({
    id: job.id || 'unknown',
    name: job.name,
    failedReason: job.failedReason || 'Unknown error',
    timestamp: job.timestamp || 0,
    attemptsMade: job.attemptsMade,
  }));

  // Get last completed job info
  let lastCompletedJob: CompletedJobInfo | null = null;
  if (completedJobs.length > 0) {
    const job = completedJobs[0];
    lastCompletedJob = {
      id: job.id || 'unknown',
      name: job.name,
      timestamp: job.finishedOn || job.timestamp || 0,
      returnvalue: job.returnvalue,
    };
  }

  return {
    name: queue.name,
    displayName,
    waiting: counts.waiting,
    active: counts.active,
    completed: counts.completed,
    failed: counts.failed,
    delayed: counts.delayed,
    paused: isPaused,
    repeatableJobs: repeatableJobs.map((job) => ({
      key: job.key,
      name: job.name,
      pattern: job.pattern || '',
      next: job.next ?? null,
    })),
    recentFailedJobs,
    lastCompletedJob,
  };
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getOrgAndCheckAccess(slug, session.user.id);

    if (!result) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Only admins and owners can view job status
    if (!['owner', 'admin'].includes(result.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get status for all queues using shared instances
    const queueConfigs: Array<{ queue: typeof queues[keyof typeof queues]; displayName: string }> = [
      { queue: queues.gmailSync, displayName: 'Gmail Sync' },
      { queue: queues.reportParser, displayName: 'Report Parser' },
      { queue: queues.sourceAggregator, displayName: 'Source Aggregator' },
      { queue: queues.alerts, displayName: 'Alerts' },
      { queue: queues.dnsCheck, displayName: 'DNS Check' },
      { queue: queues.webhookDelivery, displayName: 'Webhook Delivery' },
      { queue: queues.scheduledReports, displayName: 'Scheduled Reports' },
      { queue: queues.ipEnrichment, displayName: 'IP Enrichment' },
      { queue: queues.dataExport, displayName: 'Data Export' },
      { queue: queues.cleanup, displayName: 'Cleanup' },
    ];

    const queuesStatus = await Promise.all(
      queueConfigs.map(({ queue, displayName }) => getQueueStatus(queue, displayName))
    );

    // Calculate overall system health
    const totalActive = queuesStatus.reduce((sum, q) => sum + q.active, 0);
    const totalWaiting = queuesStatus.reduce((sum, q) => sum + q.waiting, 0);
    const totalFailed = queuesStatus.reduce((sum, q) => sum + q.failed, 0);
    const totalCompleted = queuesStatus.reduce((sum, q) => sum + q.completed, 0);

    // Check if any queues have concerning failure rates
    const queuesWithHighFailures = queuesStatus.filter(q => q.failed > 10);
    const anyQueuePaused = queuesStatus.some(q => q.paused);

    let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    let healthMessage = 'All systems operational';

    if (queuesWithHighFailures.length > 0) {
      healthStatus = 'critical';
      healthMessage = `${totalFailed} jobs have failed across ${queuesWithHighFailures.length} queue(s) - requires attention`;
    } else if (anyQueuePaused) {
      healthStatus = 'critical';
      healthMessage = 'One or more queues are paused';
    } else if (totalFailed > 5) {
      healthStatus = 'degraded';
      healthMessage = `${totalFailed} failed job${totalFailed > 1 ? 's' : ''} detected`;
    } else if (totalFailed > 0) {
      healthStatus = 'degraded';
      healthMessage = `${totalFailed} failed job${totalFailed > 1 ? 's' : ''} - may retry automatically`;
    }

    // Get Gmail sync progress from database
    const gmailAccountsData = await db
      .select({
        id: gmailAccounts.id,
        email: gmailAccounts.email,
        syncStatus: gmailAccounts.syncStatus,
        syncProgress: gmailAccounts.syncProgress,
        lastSyncAt: gmailAccounts.lastSyncAt,
      })
      .from(gmailAccounts)
      .where(eq(gmailAccounts.organizationId, result.organization.id));

    // Format Gmail sync data for display
    const gmailSyncStatus = gmailAccountsData.map((account) => {
      const progress = account.syncProgress as {
        emailsProcessed?: number;
        reportsFound?: number;
        errors?: number;
        startedAt?: string;
        completedAt?: string;
        failedAt?: string;
        error?: string;
      } | null;

      return {
        email: account.email,
        status: account.syncStatus || 'idle',
        emailsProcessed: progress?.emailsProcessed || 0,
        reportsFound: progress?.reportsFound || 0,
        errors: progress?.errors || 0,
        lastSyncAt: account.lastSyncAt?.toISOString() || null,
        startedAt: progress?.startedAt || null,
        lastError: progress?.error || null,
      };
    });

    return NextResponse.json({
      queues: queuesStatus,
      health: {
        status: healthStatus,
        message: healthMessage,
        totalActive,
        totalWaiting,
        totalCompleted,
        totalFailed,
      },
      gmailSync: gmailSyncStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching job status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job status' },
      { status: 500 }
    );
  }
}
