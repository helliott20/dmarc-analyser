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
  Shield,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Activity,
} from 'lucide-react';

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

      {/* Primary Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMessages.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.passRate}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.passedMessages.toLocaleString()} passed, {stats.failedMessages.toLocaleString()} failed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reports</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.reportsLast30Days}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Domains</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDomains}</div>
            <p className="text-xs text-muted-foreground">
              {stats.verifiedDomains} verified
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Authentication Status */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Passing Messages
            </CardTitle>
            <CardDescription>
              Messages that passed DMARC authentication
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Passed</span>
                <span className="text-2xl font-bold text-success">
                  {stats.passedMessages.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Percentage of total</span>
                <span className="font-medium">{stats.passRate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Failed Messages
            </CardTitle>
            <CardDescription>
              Messages that failed DMARC authentication
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Failed</span>
                <span className="text-2xl font-bold text-warning">
                  {stats.failedMessages.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Percentage of total</span>
                <span className="font-medium">{100 - stats.passRate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
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
