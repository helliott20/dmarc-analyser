import { notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, domains, reports, records } from '@/db/schema';
import { eq, and, count, sql, gte, inArray } from 'drizzle-orm';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Globe,
  Mail,
  Activity,
} from 'lucide-react';
import { QuickStats } from '@/components/dashboard/quick-stats';
import { DailyVolumeChart } from '@/components/dashboard/daily-volume-chart';
import { DomainBreakdownChart } from '@/components/dashboard/domain-breakdown-chart';
import { ComplianceSummary } from '@/components/dashboard/compliance-summary';
import { TopSourcesTable } from '@/components/dashboard/top-sources-table';
import { ThreatsByCountry } from '@/components/dashboard/threats-by-country';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getOrganization(slug: string, userId: string) {
  const [org] = await db
    .select({
      organization: organizations,
      role: orgMembers.role,
    })
    .from(organizations)
    .innerJoin(orgMembers, eq(organizations.id, orgMembers.organizationId))
    .where(and(eq(organizations.slug, slug), eq(orgMembers.userId, userId)));

  return org;
}

async function getOrgStats(orgId: string) {
  // Get total domains
  const [domainsCount] = await db
    .select({ count: count() })
    .from(domains)
    .where(eq(domains.organizationId, orgId));

  // Get verified domains
  const [verifiedCount] = await db
    .select({ count: count() })
    .from(domains)
    .where(and(eq(domains.organizationId, orgId), sql`${domains.verifiedAt} IS NOT NULL`));

  // Get report count (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [reportsCount] = await db
    .select({ count: count() })
    .from(reports)
    .innerJoin(domains, eq(reports.domainId, domains.id))
    .where(
      and(eq(domains.organizationId, orgId), gte(reports.dateRangeBegin, thirtyDaysAgo))
    );

  // Get all org domains
  const orgDomains = await db
    .select({ id: domains.id })
    .from(domains)
    .where(eq(domains.organizationId, orgId));

  let totalMessages = 0;
  let passedMessages = 0;

  if (orgDomains.length > 0) {
    const domainIds = orgDomains.map((d) => d.id);

    // Get all reports for org domains in the last 30 days
    const recentReports = await db
      .select({ id: reports.id })
      .from(reports)
      .where(
        and(
          inArray(reports.domainId, domainIds),
          gte(reports.dateRangeBegin, thirtyDaysAgo)
        )
      );

    if (recentReports.length > 0) {
      const reportIds = recentReports.map((r) => r.id);

      // Get all records for these reports
      const recordsData = await db
        .select({
          count: records.count,
          dmarcDkim: records.dmarcDkim,
          dmarcSpf: records.dmarcSpf,
        })
        .from(records)
        .where(inArray(records.reportId, reportIds));

      // Calculate totals in JavaScript
      for (const record of recordsData) {
        totalMessages += record.count;
        if (record.dmarcDkim === 'pass' || record.dmarcSpf === 'pass') {
          passedMessages += record.count;
        }
      }
    }
  }

  const passRate = totalMessages > 0 ? Math.round((passedMessages / totalMessages) * 100) : 0;

  return {
    totalDomains: domainsCount?.count || 0,
    verifiedDomains: verifiedCount?.count || 0,
    reportsLast30Days: reportsCount?.count || 0,
    totalMessages,
    passedMessages,
    failedMessages: totalMessages - passedMessages,
    passRate,
  };
}

export default async function OrganizationDashboardPage({ params }: PageProps) {
  const { slug } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return notFound();
  }

  const org = await getOrganization(slug, session.user.id);

  if (!org) {
    return notFound();
  }

  const stats = await getOrgStats(org.organization.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of {org.organization.name}&apos;s email authentication
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/orgs/${slug}/domains`}>
            <Globe className="h-4 w-4 mr-2" />
            View All Domains
          </Link>
        </Button>
      </div>

      {/* Quick Stats - Alerts, Tasks, Issues */}
      <QuickStats orgSlug={slug} />

      {/* At-a-glance Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{stats.totalMessages.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
            <div className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              stats.passRate >= 95 ? 'bg-success/10 text-success' :
              stats.passRate >= 80 ? 'bg-warning/10 text-warning' :
              'bg-destructive/10 text-destructive'
            }`}>
              {stats.passRate >= 95 ? 'Excellent' : stats.passRate >= 80 ? 'Good' : 'Needs Work'}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{stats.passRate}%</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-success">{stats.passedMessages.toLocaleString()} passed</span>
              <span className="text-xs text-muted-foreground">/</span>
              <span className="text-xs text-destructive">{stats.failedMessages.toLocaleString()} failed</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reports</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{stats.reportsLast30Days}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Domains</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{stats.totalDomains}</div>
            <p className="text-xs text-muted-foreground">
              {stats.verifiedDomains} verified
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts Row - Daily Volume Chart (Full Width) */}
      <DailyVolumeChart orgSlug={slug} />

      {/* Secondary Charts Row - Domain Breakdown and Compliance Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <DomainBreakdownChart orgSlug={slug} />
        <ComplianceSummary orgSlug={slug} />
      </div>

      {/* Data Tables Row - Top Sources and Threats */}
      <div className="grid gap-4 md:grid-cols-2">
        <TopSourcesTable orgSlug={slug} />
        <ThreatsByCountry orgSlug={slug} />
      </div>

      {/* Quick Actions - Only show if no domains */}
      {stats.totalDomains === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
            <CardDescription>
              Add your first domain to start monitoring DMARC reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Button asChild>
                <Link href={`/orgs/${slug}/domains`}>
                  <Globe className="h-4 w-4 mr-2" />
                  Manage Domains
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
