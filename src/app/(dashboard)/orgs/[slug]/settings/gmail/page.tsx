import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, gmailAccounts, domains, reports } from '@/db/schema';
import { eq, and, gte, desc, sql } from 'drizzle-orm';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Mail, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { GmailConnectButton } from '@/components/gmail/gmail-connect-button';
import { GmailAccountsList } from '@/components/gmail/gmail-accounts-list';
import { EmailSendingCard } from '@/components/gmail/email-sending-card';
import { ByocSettings } from '@/components/gmail/byoc-settings';
import { CENTRAL_INBOX_EMAIL, isCentralInboxEnabled } from '@/lib/central-inbox';

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface SyncProgress {
  emailsProcessed?: number;
  reportsFound?: number;
  errors?: number;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  error?: string;
  lastBatchAt?: string;
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

async function getGmailAccounts(orgId: string) {
  return db
    .select({
      id: gmailAccounts.id,
      email: gmailAccounts.email,
      syncEnabled: gmailAccounts.syncEnabled,
      sendEnabled: gmailAccounts.sendEnabled,
      notifyNewDomains: gmailAccounts.notifyNewDomains,
      notifyVerificationLapse: gmailAccounts.notifyVerificationLapse,
      lastSyncAt: gmailAccounts.lastSyncAt,
      createdAt: gmailAccounts.createdAt,
      syncStatus: gmailAccounts.syncStatus,
      syncProgress: gmailAccounts.syncProgress,
    })
    .from(gmailAccounts)
    .where(eq(gmailAccounts.organizationId, orgId))
    .orderBy(gmailAccounts.email);
}

async function getRecentReportStats(orgId: string) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Get count of reports imported in last 7 days for this org's domains
  const [stats] = await db
    .select({
      count: sql<number>`count(*)::int`,
      latestImport: sql<Date | null>`max(${reports.importedAt})`,
    })
    .from(reports)
    .innerJoin(domains, eq(reports.domainId, domains.id))
    .where(
      and(
        eq(domains.organizationId, orgId),
        gte(reports.importedAt, sevenDaysAgo)
      )
    );

  return {
    recentReportCount: stats?.count || 0,
    lastImportAt: stats?.latestImport || null,
  };
}

export default async function EmailImportPage({ params }: PageProps) {
  const { slug } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return notFound();
  }

  const result = await getOrgAndCheckAccess(slug, session.user.id);

  if (!result) {
    return notFound();
  }

  const { organization, role } = result;
  const canManage = ['owner', 'admin'].includes(role);
  const accounts = await getGmailAccounts(organization.id);
  const reportStats = await getRecentReportStats(organization.id);

  // Check if BYOC is enabled for this organization
  const useCustomOauth = organization.useCustomOauth ?? false;
  const hasCustomOauthConfigured = !!(organization.googleClientId && organization.googleClientSecret);

  // Check if reports are being received successfully
  const isReceivingReports = reportStats.recentReportCount > 0;

  // Check if this is the hosted version (central inbox enabled) or self-hosted
  const centralInboxEnabled = isCentralInboxEnabled();

  // For self-hosted: check if system-level OAuth is configured (via env vars)
  // This allows self-hosted users to connect Gmail without BYOC setup
  const hasSystemOauth = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  // Determine if Gmail connection should be shown:
  // - For hosted: Only if org has BYOC enabled and configured
  // - For self-hosted: Always show if system OAuth is configured, or if org has BYOC
  const canConnectGmail = centralInboxEnabled
    ? (useCustomOauth && hasCustomOauthConfigured)
    : (hasSystemOauth || (useCustomOauth && hasCustomOauthConfigured));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Email Import</h1>
        <p className="text-muted-foreground">
          Configure how DMARC reports are received and imported
        </p>
      </div>

      {/* Central Inbox - Only for hosted version */}
      {centralInboxEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Receive DMARC Reports
              {isReceivingReports && (
                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Active
                </span>
              )}
            </CardTitle>
            <CardDescription>
              {isReceivingReports
                ? `Receiving reports successfully - ${reportStats.recentReportCount} reports in the last 7 days`
                : 'One simple step to start receiving DMARC reports'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Success state */}
            {isReceivingReports && (
              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-800 dark:text-green-200">Setup Complete</p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Reports are being received at <span className="font-mono">{CENTRAL_INBOX_EMAIL}</span>
                    </p>
                  </div>
                </div>
                {reportStats.lastImportAt && (
                  <p className="mt-3 text-xs text-green-600 dark:text-green-400">
                    Last report received: {new Date(reportStats.lastImportAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                )}
              </div>
            )}

            {/* Setup instructions (always visible for reference) */}
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <h4 className="font-semibold">{isReceivingReports ? 'Your report email address' : 'Add this email to your DMARC record'}</h4>
                <div className="p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-sm">
                  <span className="text-green-400">{CENTRAL_INBOX_EMAIL}</span>
                </div>
              </div>

              {!isReceivingReports && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Your full DMARC record should look like this:
                  </p>
                  <div className="p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-sm overflow-x-auto">
                    <div>
                      <span className="text-slate-500">Record:</span> <span className="text-blue-400">_dmarc.yourdomain.com</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Type:</span> <span className="text-yellow-400">TXT</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Value:</span> <span className="text-slate-300">v=DMARC1; p=none; rua=mailto:</span><span className="text-green-400">{CENTRAL_INBOX_EMAIL}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Already have a DMARC record? Just add or update the <code className="bg-muted px-1 rounded">rua=mailto:{CENTRAL_INBOX_EMAIL}</code> part.
                  </p>
                </div>
              )}
            </div>

            {/* Helper tip */}
            <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Quick tip:</strong> Visit any domain in your list and click &quot;DMARC Record&quot; to copy a ready-to-use record that preserves your existing settings.
              </p>
            </div>

            {/* Timeline - only show if not receiving reports yet */}
            {!isReceivingReports && (
              <div className="flex items-start gap-3 p-3 rounded-lg border">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Reports arrive automatically</p>
                  <p className="text-muted-foreground">
                    Email providers send DMARC reports daily. Expect your first reports within 24-48 hours after updating DNS. We check for new reports every 15 minutes.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Gmail/BYOC Section */}
      <Card className={centralInboxEnabled ? 'border-dashed' : ''}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${centralInboxEnabled ? 'text-muted-foreground' : ''}`}>
            {centralInboxEnabled ? (
              <>
                <AlertTriangle className="h-5 w-5" />
                Advanced: Use Your Own Gmail Account
              </>
            ) : (
              <>
                <Mail className="h-5 w-5" />
                Connect Gmail Account
                {isReceivingReports && (
                  <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Active
                  </span>
                )}
              </>
            )}
          </CardTitle>
          <CardDescription>
            {centralInboxEnabled
              ? 'For advanced users who want to connect their own Gmail account directly'
              : 'Connect your Gmail account to automatically import DMARC reports'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* For self-hosted, show success state if reports are coming in */}
          {!centralInboxEnabled && isReceivingReports && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-semibold text-green-800 dark:text-green-200">Setup Complete</p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {reportStats.recentReportCount} reports received in the last 7 days
                  </p>
                </div>
              </div>
              {reportStats.lastImportAt && (
                <p className="mt-3 text-xs text-green-600 dark:text-green-400">
                  Last report received: {new Date(reportStats.lastImportAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              )}
            </div>
          )}

          {/* For hosted version: Show BYOC settings (custom OAuth) */}
          {/* For self-hosted: Only show BYOC if system OAuth is not configured */}
          {(centralInboxEnabled || !hasSystemOauth) && (
            <ByocSettings
              orgSlug={slug}
              orgId={organization.id}
              canManage={canManage}
              useCustomOauth={useCustomOauth}
              hasCredentials={hasCustomOauthConfigured}
            />
          )}

          {/* Show Gmail connection when available */}
          {canConnectGmail && (
            <div className="mt-6 pt-6 border-t space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Connected Gmail Accounts</h4>
                  <p className="text-sm text-muted-foreground">
                    Gmail accounts connected using your OAuth credentials
                  </p>
                </div>
                {canManage && (
                  <GmailConnectButton orgSlug={slug} orgId={organization.id} />
                )}
              </div>

              {accounts.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Mail className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No Gmail accounts connected yet</p>
                </div>
              ) : (
                <GmailAccountsList
                  initialAccounts={accounts.map((account) => ({
                    ...account,
                    syncProgress: account.syncProgress as SyncProgress | null,
                  }))}
                  orgSlug={slug}
                  canManage={canManage}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Sending - Only relevant if BYOC accounts exist */}
      {accounts.length > 0 && (
        <EmailSendingCard
          accounts={accounts.map(a => ({ id: a.id, email: a.email, sendEnabled: a.sendEnabled, notifyNewDomains: a.notifyNewDomains, notifyVerificationLapse: a.notifyVerificationLapse }))}
          orgSlug={slug}
          orgId={organization.id}
        />
      )}
    </div>
  );
}
