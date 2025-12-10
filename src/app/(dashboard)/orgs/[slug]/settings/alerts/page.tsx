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
import { AlertRulesManager } from '@/components/alerts/alert-rules-manager';
import { ContextHelp } from '@/components/help/context-help';
import { Bell, Info } from 'lucide-react';

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

export default async function AlertSettingsPage({ params }: PageProps) {
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
          <h1 className="text-2xl font-bold tracking-tight">Alert Settings</h1>
          <p className="text-muted-foreground">
            You don&apos;t have permission to manage alert rules
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Alert Settings</h1>
          <ContextHelp
            article="alerts"
            title="Learn about alerts"
            description="Learn how to configure alert rules and notification preferences"
            href="/help/alerts"
          />
        </div>
        <p className="text-muted-foreground">
          Configure alert rules and notification preferences for {organization.name}
        </p>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            About Alert Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Alert rules help you monitor important changes and anomalies in your DMARC
            reports. You can configure rules at the organization level (applies to all
            domains) or for specific domains.
          </p>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Available Alert Types:</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
              <li>
                <strong>Pass Rate Drop:</strong> Triggered when authentication pass rate
                falls below a threshold
              </li>
              <li>
                <strong>New Source:</strong> Alerts when email is sent from a new IP
                address
              </li>
              <li>
                <strong>DMARC Failure Spike:</strong> Detects sudden increases in DMARC
                failures
              </li>
              <li>
                <strong>DNS Change:</strong> Notifies when DMARC or SPF records are
                modified
              </li>
              <li>
                <strong>Auth Failure Spike:</strong> Alerts on SPF/DKIM authentication
                spikes
              </li>
              <li>
                <strong>Policy Change:</strong> Tracks changes to DMARC policy (p= tag)
              </li>
              <li>
                <strong>Compliance Drop:</strong> Monitors overall compliance metrics
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Alert Rules Manager */}
      <AlertRulesManager orgSlug={slug} orgId={organization.id} />
    </div>
  );
}
