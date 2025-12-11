import { notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import {
  organizations,
  orgMembers,
  domains,
  forensicReports,
} from '@/db/schema';
import { eq, and, desc, sql, count } from 'drizzle-orm';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowLeft, Shield, AlertTriangle, Bug, Ban } from 'lucide-react';
import { ForensicReportsTable } from '@/components/forensic/forensic-reports-table';

interface PageProps {
  params: Promise<{ slug: string; domainId: string }>;
  searchParams: Promise<{
    feedbackType?: string;
    startDate?: string;
    endDate?: string;
  }>;
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

async function getForensicReports(domainId: string) {
  // Get recent forensic reports
  const reports = await db
    .select({
      id: forensicReports.id,
      reportId: forensicReports.reportId,
      feedbackType: forensicReports.feedbackType,
      reporterOrgName: forensicReports.reporterOrgName,
      arrivalDate: forensicReports.arrivalDate,
      sourceIp: forensicReports.sourceIp,
      originalMailFrom: forensicReports.originalMailFrom,
      originalRcptTo: forensicReports.originalRcptTo,
      subject: forensicReports.subject,
      messageId: forensicReports.messageId,
      authResults: forensicReports.authResults,
      dkimResult: forensicReports.dkimResult,
      spfResult: forensicReports.spfResult,
      dkimDomain: forensicReports.dkimDomain,
      spfDomain: forensicReports.spfDomain,
      createdAt: forensicReports.createdAt,
    })
    .from(forensicReports)
    .where(eq(forensicReports.domainId, domainId))
    .orderBy(desc(forensicReports.arrivalDate))
    .limit(100);

  return reports;
}

async function getForensicStats(domainId: string) {
  // Get total count
  const [totalResult] = await db
    .select({ count: count() })
    .from(forensicReports)
    .where(eq(forensicReports.domainId, domainId));

  // Get counts by feedback type
  const typeStats = await db
    .select({
      feedbackType: forensicReports.feedbackType,
      count: count(),
    })
    .from(forensicReports)
    .where(eq(forensicReports.domainId, domainId))
    .groupBy(forensicReports.feedbackType);

  // Get auth failure counts
  const [authFailures] = await db
    .select({
      spfFails: sql<number>`SUM(CASE WHEN ${forensicReports.spfResult} IN ('fail', 'softfail') THEN 1 ELSE 0 END)`,
      dkimFails: sql<number>`SUM(CASE WHEN ${forensicReports.dkimResult} = 'fail' THEN 1 ELSE 0 END)`,
    })
    .from(forensicReports)
    .where(eq(forensicReports.domainId, domainId));

  const stats = {
    total: totalResult?.count || 0,
    byType: typeStats.reduce((acc, stat) => {
      if (stat.feedbackType) {
        acc[stat.feedbackType] = stat.count;
      }
      return acc;
    }, {} as Record<string, number>),
    spfFailures: Number(authFailures?.spfFails) || 0,
    dkimFailures: Number(authFailures?.dkimFails) || 0,
  };

  return stats;
}

export default async function ForensicReportsPage({ params }: PageProps) {
  const { slug, domainId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return notFound();
  }

  const result = await getDomainWithAccess(domainId, slug, session.user.id);

  if (!result) {
    return notFound();
  }

  const { domain } = result;

  // Check if domain is verified - show verification message if not
  if (!domain.verifiedAt) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/orgs/${slug}/domains/${domainId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to {domain.domain}
            </Link>
          </Button>
        </div>
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  Domain verification required
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  You need to verify ownership of this domain before viewing forensic reports.
                  Go to the domain overview page to complete verification.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [rawReports, stats] = await Promise.all([
    getForensicReports(domainId),
    getForensicStats(domainId),
  ]);

  // Serialize dates for client component
  const reports = rawReports.map(report => ({
    ...report,
    arrivalDate: report.arrivalDate?.toISOString() || null,
    createdAt: report.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/orgs/${slug}/domains/${domainId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {domain.domain}
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Forensic Reports (RUF)</h1>
          <p className="text-muted-foreground">
            Individual failure reports for {domain.domain}
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All forensic reports
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auth Failures</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.byType['auth-failure'] || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              DMARC authentication failures
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SPF Failures</CardTitle>
            <Ban className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.spfFailures}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Failed SPF checks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">DKIM Failures</CardTitle>
            <Ban className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.dkimFailures}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Failed DKIM checks
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown by Type */}
      {Object.keys(stats.byType).length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Reports by Type</CardTitle>
            <CardDescription>
              Breakdown of forensic reports by feedback type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.entries(stats.byType).map(([type, count]) => (
                <div key={type} className="space-y-1">
                  <p className="text-sm text-muted-foreground capitalize">
                    {type.replace('-', ' ')}
                  </p>
                  <p className="text-2xl font-bold">{count}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Forensic Reports</CardTitle>
          <CardDescription>
            {reports.length} reports received
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No forensic reports yet</h3>
              <p className="text-muted-foreground">
                Forensic reports (RUF) will appear here when email providers send them.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Note: Not all email providers send forensic reports, and they must be explicitly requested in your DMARC record.
              </p>
            </div>
          ) : (
            <ForensicReportsTable
              reports={reports}
              orgSlug={slug}
              domainId={domainId}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
