import { notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, alerts, domains } from '@/db/schema';
import { eq, and, desc, count } from 'drizzle-orm';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Info,
  Settings,
  XCircle,
} from 'lucide-react';
import { AlertsList } from '@/components/alerts/alerts-list';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    type?: string;
    severity?: string;
    read?: string;
    dismissed?: string;
  }>;
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

async function getAlertStats(orgId: string) {
  // Get unread count
  const [unreadResult] = await db
    .select({ count: count() })
    .from(alerts)
    .where(
      and(
        eq(alerts.organizationId, orgId),
        eq(alerts.isRead, false),
        eq(alerts.isDismissed, false)
      )
    );

  // Get critical alerts count
  const [criticalResult] = await db
    .select({ count: count() })
    .from(alerts)
    .where(
      and(
        eq(alerts.organizationId, orgId),
        eq(alerts.severity, 'critical'),
        eq(alerts.isDismissed, false)
      )
    );

  // Get warning alerts count
  const [warningResult] = await db
    .select({ count: count() })
    .from(alerts)
    .where(
      and(
        eq(alerts.organizationId, orgId),
        eq(alerts.severity, 'warning'),
        eq(alerts.isDismissed, false)
      )
    );

  // Get info alerts count
  const [infoResult] = await db
    .select({ count: count() })
    .from(alerts)
    .where(
      and(
        eq(alerts.organizationId, orgId),
        eq(alerts.severity, 'info'),
        eq(alerts.isDismissed, false)
      )
    );

  return {
    unread: unreadResult?.count || 0,
    critical: criticalResult?.count || 0,
    warning: warningResult?.count || 0,
    info: infoResult?.count || 0,
  };
}

export default async function AlertsPage({ params, searchParams }: PageProps) {
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
  const canManageRules = ['owner', 'admin'].includes(role);
  const stats = await getAlertStats(organization.id);
  const filters = await searchParams;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
          <p className="text-muted-foreground">
            Monitor important events and anomalies in your DMARC reports
          </p>
        </div>
        {canManageRules && (
          <Button asChild variant="outline">
            <Link href={`/orgs/${slug}/settings/alerts`}>
              <Settings className="h-4 w-4 mr-2" />
              Configure Alert Rules
            </Link>
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread Alerts</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unread}</div>
            <p className="text-xs text-muted-foreground">
              Require your attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
            <p className="text-xs text-muted-foreground">
              Immediate action required
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.warning}</div>
            <p className="text-xs text-muted-foreground">
              Review recommended
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Info</CardTitle>
            <Info className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.info}</div>
            <p className="text-xs text-muted-foreground">
              Informational updates
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      <AlertsList orgSlug={slug} filters={filters} />
    </div>
  );
}
