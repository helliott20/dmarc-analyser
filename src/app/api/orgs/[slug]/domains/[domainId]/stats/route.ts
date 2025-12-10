import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import {
  organizations,
  orgMembers,
  domains,
  reports,
  records,
  gmailAccounts,
} from '@/db/schema';
import { eq, and, gte, inArray, count } from 'drizzle-orm';

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

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug, domainId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getDomainWithAccess(domainId, slug, session.user.id);

    if (!result) {
      return NextResponse.json(
        { error: 'Domain not found or insufficient permissions' },
        { status: 404 }
      );
    }

    const { organization } = result;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get report counts (30 days and all time)
    const [[reportsCount30d], [reportsCountAll]] = await Promise.all([
      db
        .select({ count: count() })
        .from(reports)
        .where(
          and(
            eq(reports.domainId, domainId),
            gte(reports.dateRangeBegin, thirtyDaysAgo)
          )
        ),
      db
        .select({ count: count() })
        .from(reports)
        .where(eq(reports.domainId, domainId)),
    ]);

    // Get all reports for this domain (for all-time stats)
    const allReports = await db
      .select({
        reportId: reports.id,
        dateRangeBegin: reports.dateRangeBegin,
      })
      .from(reports)
      .where(eq(reports.domainId, domainId));

    let totalMessages30d = 0;
    let passedMessages30d = 0;
    let totalMessagesAll = 0;
    let passedMessagesAll = 0;

    if (allReports.length > 0) {
      const reportIds = allReports.map((r) => r.reportId);
      const recordsData = await db
        .select({
          reportId: records.reportId,
          count: records.count,
          dmarcDkim: records.dmarcDkim,
          dmarcSpf: records.dmarcSpf,
        })
        .from(records)
        .where(inArray(records.reportId, reportIds));

      // Create a map of reportId to dateRangeBegin for filtering
      const reportDateMap = new Map(
        allReports.map((r) => [r.reportId, r.dateRangeBegin])
      );

      for (const record of recordsData) {
        const isPassing = record.dmarcDkim === 'pass' || record.dmarcSpf === 'pass';
        const reportDate = reportDateMap.get(record.reportId);
        const isRecent = reportDate && reportDate >= thirtyDaysAgo;

        // All-time totals
        totalMessagesAll += record.count;
        if (isPassing) {
          passedMessagesAll += record.count;
        }

        // 30-day totals
        if (isRecent) {
          totalMessages30d += record.count;
          if (isPassing) {
            passedMessages30d += record.count;
          }
        }
      }
    }

    const passRate =
      totalMessages30d > 0 ? Math.round((passedMessages30d / totalMessages30d) * 1000) / 10 : 0;
    const passRateAll =
      totalMessagesAll > 0 ? Math.round((passedMessagesAll / totalMessagesAll) * 1000) / 10 : 0;

    // Check if any Gmail account is currently syncing for this org
    const [syncingAccount] = await db
      .select({
        id: gmailAccounts.id,
        syncStatus: gmailAccounts.syncStatus,
        syncStartedAt: gmailAccounts.syncStartedAt,
      })
      .from(gmailAccounts)
      .where(
        and(
          eq(gmailAccounts.organizationId, organization.id),
          eq(gmailAccounts.syncStatus, 'syncing')
        )
      )
      .limit(1);

    let isSyncing = !!syncingAccount;

    // If sync has been running for more than 30 minutes, it's probably stuck - reset it
    if (syncingAccount?.syncStartedAt) {
      const syncAge = Date.now() - new Date(syncingAccount.syncStartedAt).getTime();
      const thirtyMinutes = 30 * 60 * 1000;
      if (syncAge > thirtyMinutes) {
        await db
          .update(gmailAccounts)
          .set({ syncStatus: 'idle', syncProgress: null })
          .where(eq(gmailAccounts.id, syncingAccount.id));
        isSyncing = false;
      }
    }

    return NextResponse.json({
      reportsLast30Days: reportsCount30d?.count || 0,
      reportsAllTime: reportsCountAll?.count || 0,
      totalMessages: totalMessages30d,
      totalMessagesAllTime: totalMessagesAll,
      passedMessages: passedMessages30d,
      passedMessagesAllTime: passedMessagesAll,
      passRate,
      passRateAllTime: passRateAll,
      isSyncing,
    });
  } catch (error) {
    console.error('Failed to get domain stats:', error);
    return NextResponse.json(
      { error: 'Failed to get domain stats' },
      { status: 500 }
    );
  }
}
