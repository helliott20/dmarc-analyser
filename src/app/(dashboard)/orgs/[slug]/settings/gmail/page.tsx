import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, gmailAccounts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { GmailConnectButton } from '@/components/gmail/gmail-connect-button';
import { GmailAccountCard } from '@/components/gmail/gmail-account-card';
import { EmailSendingCard } from '@/components/gmail/email-sending-card';

interface PageProps {
  params: Promise<{ slug: string }>;
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
    .select()
    .from(gmailAccounts)
    .where(eq(gmailAccounts.organizationId, orgId))
    .orderBy(gmailAccounts.email);
}

export default async function GmailSettingsPage({ params }: PageProps) {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gmail Import</h1>
        <p className="text-muted-foreground">
          Connect Gmail accounts to automatically import DMARC reports
        </p>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            How Gmail Import Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            When you connect a Gmail account, the DMARC Analyser will:
          </p>
          <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2 ml-2">
            <li>
              Search for DMARC aggregate reports in your inbox (emails with
              subject containing &quot;DMARC&quot; and &quot;Report&quot;)
            </li>
            <li>
              Extract and parse the XML attachments (including .zip and .gz
              compressed files)
            </li>
            <li>
              Import the report data and associate it with your verified domains
            </li>
            <li>
              Optionally apply a label to processed emails for easy organization
            </li>
          </ol>
          <div className="flex items-start gap-2 p-3 bg-muted rounded-md">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
            <p className="text-sm">
              <strong>Privacy Note:</strong> Only emails matching DMARC report
              patterns are accessed. We never read your regular emails.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Connected Accounts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Connected Accounts</CardTitle>
            <CardDescription>
              Gmail accounts connected for DMARC report import
            </CardDescription>
          </div>
          {canManage && (
            <GmailConnectButton orgSlug={slug} orgId={organization.id} />
          )}
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                No Gmail accounts connected
              </h3>
              <p className="text-muted-foreground mb-4">
                Connect a Gmail account to start importing DMARC reports
                automatically.
              </p>
              {canManage && (
                <GmailConnectButton orgSlug={slug} orgId={organization.id} />
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {accounts.map((account) => (
                <GmailAccountCard
                  key={account.id}
                  account={account}
                  orgSlug={slug}
                  canManage={canManage}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Sending */}
      <EmailSendingCard
        accounts={accounts.map(a => ({ id: a.id, email: a.email }))}
        orgSlug={slug}
      />

      {/* DMARC Setup Guide */}
      <Card>
        <CardHeader>
          <CardTitle>DMARC RUA Configuration</CardTitle>
          <CardDescription>
            Configure your DMARC record to send aggregate reports to your Gmail
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            To receive DMARC reports in your connected Gmail account, update your
            domain&apos;s DMARC DNS record to include the RUA (Reporting URI for
            Aggregate reports) tag:
          </p>
          <div className="p-3 bg-muted rounded-md font-mono text-sm">
            v=DMARC1; p=none; rua=mailto:
            <span className="text-primary">your-email@gmail.com</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Replace <code className="text-primary">your-email@gmail.com</code>{' '}
            with the Gmail address you&apos;ve connected. Reports will typically
            arrive daily from major email providers like Google, Microsoft, and
            Yahoo.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
