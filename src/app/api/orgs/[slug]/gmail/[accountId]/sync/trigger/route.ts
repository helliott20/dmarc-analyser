import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, gmailAccounts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { gmailSyncQueue } from '@/jobs/queues';
import type { GmailSyncJobData } from '@/jobs/types';

interface RouteParams {
  params: Promise<{ slug: string; accountId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug, accountId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get organization and check membership
    const [orgResult] = await db
      .select({
        organization: organizations,
        role: orgMembers.role,
      })
      .from(organizations)
      .innerJoin(orgMembers, eq(organizations.id, orgMembers.organizationId))
      .where(and(eq(organizations.slug, slug), eq(orgMembers.userId, session.user.id)));

    if (!orgResult) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Only admins and owners can trigger sync
    if (!['owner', 'admin'].includes(orgResult.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get Gmail account
    const [account] = await db
      .select()
      .from(gmailAccounts)
      .where(
        and(
          eq(gmailAccounts.id, accountId),
          eq(gmailAccounts.organizationId, orgResult.organization.id)
        )
      );

    if (!account) {
      return NextResponse.json({ error: 'Gmail account not found' }, { status: 404 });
    }

    // Check for existing job using stable ID
    const jobId = `gmail-sync-${accountId}`;
    const existingJob = await gmailSyncQueue.getJob(jobId);

    if (existingJob) {
      const state = await existingJob.getState();
      if (state === 'active' || state === 'waiting' || state === 'delayed') {
        return NextResponse.json(
          {
            error: 'Sync already in progress',
            status: 'syncing',
            jobState: state,
          },
          { status: 409 }
        );
      }
      // Job exists but is completed/failed - remove it so we can add a new one
      await existingJob.remove();
    } else if (account.syncStatus === 'syncing') {
      // Database says syncing but no job exists - reset stale status
      console.log(`[Gmail Sync] Resetting stale sync status for account ${accountId}`);
      await db
        .update(gmailAccounts)
        .set({
          syncStatus: 'idle',
          syncProgress: null,
          updatedAt: new Date(),
        })
        .where(eq(gmailAccounts.id, accountId));
    }

    // Parse request body for options
    let fullSync = false;
    try {
      const body = await request.json();
      fullSync = body.fullSync === true;
    } catch {
      // No body or invalid JSON - use defaults
    }

    // Queue the sync job
    const jobData: GmailSyncJobData = {
      gmailAccountId: accountId,
      organizationId: orgResult.organization.id,
      fullSync,
    };

    await gmailSyncQueue.add(`manual-sync-${accountId}`, jobData, {
      jobId: jobId, // Stable ID prevents duplicates
      priority: 10, // Higher priority than scheduled (default is 0)
    });

    // Update sync status in database immediately for UI feedback
    await db
      .update(gmailAccounts)
      .set({
        syncStatus: 'syncing',
        syncProgress: {
          emailsProcessed: 0,
          reportsFound: 0,
          errors: 0,
          startedAt: new Date().toISOString(),
          triggeredBy: 'manual',
        },
        updatedAt: new Date(),
      })
      .where(eq(gmailAccounts.id, accountId));

    return NextResponse.json(
      {
        success: true,
        jobId: jobId,
        status: 'queued',
        message: `Sync started for ${account.email}`,
      },
      { status: 202 }
    );
  } catch (error) {
    console.error('Error triggering Gmail sync:', error);
    return NextResponse.json(
      { error: 'Failed to trigger sync' },
      { status: 500 }
    );
  }
}
