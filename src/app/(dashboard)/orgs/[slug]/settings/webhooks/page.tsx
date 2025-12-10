import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { WebhookManager } from '@/components/webhooks/webhook-manager';
import { Info, Webhook } from 'lucide-react';

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

export default async function WebhookSettingsPage({ params }: PageProps) {
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

  if (!canManage) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Webhook Settings</h1>
          <p className="text-muted-foreground">
            You don&apos;t have permission to manage webhooks
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Webhook Settings</h1>
        <p className="text-muted-foreground">
          Configure webhooks to receive real-time notifications for {organization.name}
        </p>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            About Webhooks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Webhooks allow you to receive real-time notifications about events in your DMARC
            analyzer. You can send notifications to Slack, Discord, Microsoft Teams, or custom
            endpoints.
          </p>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Supported Platforms:</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
              <li>
                <strong>Slack:</strong> Send formatted messages to Slack channels using
                incoming webhooks
              </li>
              <li>
                <strong>Discord:</strong> Post notifications to Discord channels with rich
                embeds
              </li>
              <li>
                <strong>Microsoft Teams:</strong> Send adaptive cards to Teams channels
              </li>
              <li>
                <strong>Custom URL:</strong> Send JSON payloads to your own endpoints with
                HMAC signatures
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Available Events:</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
              <li>
                <strong>Alert Created:</strong> Triggered when a new alert is created
              </li>
              <li>
                <strong>Report Received:</strong> Notifies when a new DMARC report arrives
              </li>
              <li>
                <strong>New Source:</strong> Alerts when email is sent from a new IP address
              </li>
              <li>
                <strong>Domain Verified:</strong> Triggered when a domain is verified
              </li>
              <li>
                <strong>Compliance Drop:</strong> Notifies when compliance metrics drop below
                threshold
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Filters:</h4>
            <p className="text-sm text-muted-foreground">
              You can filter webhooks by:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
              <li>
                <strong>Event Type:</strong> Subscribe to specific events only
              </li>
              <li>
                <strong>Severity:</strong> Filter alerts by severity (info, warning, critical)
              </li>
              <li>
                <strong>Domain:</strong> Receive notifications for a specific domain only
              </li>
            </ul>
          </div>

          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm font-semibold text-yellow-900 mb-1">
              Security Note for Custom Webhooks
            </p>
            <p className="text-sm text-yellow-800">
              Custom webhooks include an HMAC signature in the{' '}
              <code className="px-1 py-0.5 bg-yellow-100 rounded">X-Webhook-Signature</code>{' '}
              header. Verify this signature using your webhook secret to ensure the request
              is authentic.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Manager */}
      <WebhookManager orgSlug={slug} orgId={organization.id} />
    </div>
  );
}
