import { notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import {
  organizations,
  orgMembers,
  domains,
  reports,
  records,
  subdomains,
} from '@/db/schema';
import { eq, and, count, gte, desc, inArray, sql } from 'drizzle-orm';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import {
  Globe,
  CheckCircle2,
  Clock,
  Mail,
  ExternalLink,
  BarChart3,
  Server,
  Network,
  AlertTriangle,
} from 'lucide-react';
import { DomainVerification } from '@/components/domains/domain-verification';
import { DnsRecordsCard } from '@/components/domains/dns-records-card';
import { DomainStats } from '@/components/domains/domain-stats';
import { PolicyRecommendations } from '@/components/domains/policy-recommendations';
import { DomainTagsManager } from '@/components/domains/domain-tags-manager';

interface PageProps {
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

async function getDomainStats(domainId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get report count
  const [reportsCount] = await db
    .select({ count: count() })
    .from(reports)
    .where(
      and(eq(reports.domainId, domainId), gte(reports.dateRangeBegin, thirtyDaysAgo))
    );

  // Get total messages and pass rate
  const reportsWithRecords = await db
    .select({
      reportId: reports.id,
    })
    .from(reports)
    .where(
      and(eq(reports.domainId, domainId), gte(reports.dateRangeBegin, thirtyDaysAgo))
    );

  let totalMessages = 0;
  let passedMessages = 0;

  if (reportsWithRecords.length > 0) {
    const reportIds = reportsWithRecords.map((r) => r.reportId);
    const recordsData = await db
      .select({
        count: records.count,
        dmarcDkim: records.dmarcDkim,
        dmarcSpf: records.dmarcSpf,
      })
      .from(records)
      .where(inArray(records.reportId, reportIds));

    for (const record of recordsData) {
      totalMessages += record.count;
      if (record.dmarcDkim === 'pass' || record.dmarcSpf === 'pass') {
        passedMessages += record.count;
      }
    }
  }

  const passRate = totalMessages > 0 ? (passedMessages / totalMessages) * 100 : 0;

  return {
    reportsLast30Days: reportsCount?.count || 0,
    totalMessages,
    passRate: Math.round(passRate * 10) / 10,
  };
}

async function getRecentReports(domainId: string) {
  return db
    .select({
      id: reports.id,
      orgName: reports.orgName,
      dateRangeBegin: reports.dateRangeBegin,
      dateRangeEnd: reports.dateRangeEnd,
    })
    .from(reports)
    .where(eq(reports.domainId, domainId))
    .orderBy(desc(reports.dateRangeEnd))
    .limit(5);
}

async function getSubdomainStats(domainId: string) {
  const subdomainsList = await db
    .select({
      messageCount: subdomains.messageCount,
      passCount: subdomains.passCount,
      failCount: subdomains.failCount,
    })
    .from(subdomains)
    .where(eq(subdomains.domainId, domainId));

  const totalSubdomains = subdomainsList.length;

  // Calculate low pass rate subdomains (< 80%)
  const lowPassRateCount = subdomainsList.filter((sub) => {
    const messageCount = Number(sub.messageCount);
    const passCount = Number(sub.passCount);
    if (messageCount === 0) return false;
    const passRate = (passCount / messageCount) * 100;
    return passRate < 80;
  }).length;

  return {
    totalSubdomains,
    lowPassRateCount,
  };
}

export default async function DomainPage({ params }: PageProps) {
  const { slug, domainId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return notFound();
  }

  const result = await getDomainWithAccess(domainId, slug, session.user.id);

  if (!result) {
    return notFound();
  }

  const { domain, role } = result;
  const [stats, recentReports, subdomainStats] = await Promise.all([
    getDomainStats(domainId),
    getRecentReports(domainId),
    getSubdomainStats(domainId),
  ]);

  const isVerified = !!domain.verifiedAt;
  const isVerificationLapsed = !!domain.verificationLapsedAt;
  const canManage = ['owner', 'admin', 'member'].includes(role);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/orgs/${slug}`}>Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/orgs/${slug}/domains`}>Domains</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{domain.domain}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Globe className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {domain.domain}
              </h1>
              {isVerified && !isVerificationLapsed ? (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Verified
                </Badge>
              ) : isVerified && isVerificationLapsed ? (
                <Badge variant="outline" className="gap-1 text-orange-600 border-orange-300">
                  <AlertTriangle className="h-3 w-3" />
                  Verification Lapsed
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-yellow-600">
                  <Clock className="h-3 w-3" />
                  Pending Verification
                </Badge>
              )}
            </div>
            {domain.displayName && (
              <p className="text-muted-foreground">{domain.displayName}</p>
            )}
            {/* Tags */}
            <div className="mt-2">
              <DomainTagsManager
                domainId={domainId}
                orgSlug={slug}
                canManage={canManage}
              />
            </div>
          </div>
        </div>

        {/* Quick Navigation (only show data pages if verified) */}
        {isVerified && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/orgs/${slug}/domains/${domainId}/timeline`}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Timeline
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/orgs/${slug}/domains/${domainId}/sources`}>
                <Server className="h-4 w-4 mr-2" />
                Sources
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/orgs/${slug}/domains/${domainId}/reports`}>
                <Mail className="h-4 w-4 mr-2" />
                Reports
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Verification Card (if not verified) */}
      {!isVerified && canManage && (
        <DomainVerification
          domain={domain.domain}
          verificationToken={domain.verificationToken!}
          domainId={domain.id}
          orgSlug={slug}
        />
      )}

      {/* Verification Lapsed Warning */}
      {isVerified && isVerificationLapsed && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-orange-800 dark:text-orange-200">
                  Domain verification has lapsed
                </p>
                <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                  The verification DNS record for this domain could not be found. This may indicate
                  that the record was removed or domain ownership has changed. DMARC monitoring
                  continues but we recommend re-adding the verification record.
                </p>
                <div className="mt-3 p-3 bg-orange-100 dark:bg-orange-900/30 rounded-md">
                  <p className="text-xs text-orange-700 dark:text-orange-300 font-medium mb-1">
                    Add this TXT record to restore verification:
                  </p>
                  <div className="text-xs font-mono text-orange-800 dark:text-orange-200">
                    <p><span className="text-orange-600">Name:</span> _dmarc-verify.{domain.domain}</p>
                    <p><span className="text-orange-600">Value:</span> {domain.verificationToken}</p>
                  </div>
                </div>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                  Lapsed on {new Date(domain.verificationLapsedAt!).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Hidden Warning (if not verified) */}
      {!isVerified && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  Report data is hidden until domain is verified
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  DMARC reports are being collected for this domain, but you need to verify
                  ownership before viewing the data. This ensures only domain owners can
                  access email authentication reports.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards - with live polling during sync (only show if verified) */}
      {isVerified && (
        <DomainStats
          orgSlug={slug}
          domainId={domainId}
          initialStats={stats}
        />
      )}

      {/* DNS Records Card */}
      <DnsRecordsCard
        domain={domain.domain}
        domainId={domainId}
        orgSlug={slug}
        dmarcRecord={domain.dmarcRecord}
        spfRecord={domain.spfRecord}
      />

      {/* Policy Recommendations */}
      <PolicyRecommendations
        orgSlug={slug}
        domainId={domainId}
      />

      {/* Subdomain Summary (only show if verified) */}
      {isVerified && subdomainStats.totalSubdomains > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Subdomains</CardTitle>
              <CardDescription>
                Subdomains discovered from DMARC reports
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/orgs/${slug}/domains/${domainId}/subdomains`}>
                View All
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Network className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {subdomainStats.totalSubdomains}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Total Subdomains
                  </p>
                </div>
              </div>
              {subdomainStats.lowPassRateCount > 0 && (
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {subdomainStats.lowPassRateCount}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Low Pass Rate (&lt;80%)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Reports (only show if verified) */}
      {isVerified && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Reports</CardTitle>
              <CardDescription>Latest DMARC aggregate reports</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/orgs/${slug}/domains/${domainId}/reports`}>
                View All
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentReports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No reports received yet</p>
                <p className="text-sm mt-2">
                  Reports will appear here once email providers start sending them
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {recentReports.map((report) => (
                  <Link
                    key={report.id}
                    href={`/orgs/${slug}/domains/${domainId}/reports/${report.id}`}
                    className="flex items-center justify-between py-3 hover:bg-muted/50 -mx-4 px-4 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{report.orgName}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(report.dateRangeBegin).toLocaleDateString()} -{' '}
                        {new Date(report.dateRangeEnd).toLocaleDateString()}
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
