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
import { DmarcRecordCard } from '@/components/domains/dmarc-record-card';
import { DomainStats } from '@/components/domains/domain-stats';
import { PolicyRecommendations } from '@/components/domains/policy-recommendations';

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
  const canManage = ['owner', 'admin', 'member'].includes(role);

  return (
    <div className="space-y-6">
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
              {isVerified ? (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Verified
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
          </div>
        </div>

        {/* Quick Navigation */}
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

      {/* Stats Cards - with live polling during sync */}
      <DomainStats
        orgSlug={slug}
        domainId={domainId}
        initialStats={stats}
      />

      {/* DMARC Record Card and Policy Recommendations */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DmarcRecordCard domain={domain.domain} dmarcRecord={domain.dmarcRecord} />
        <PolicyRecommendations
          orgSlug={slug}
          domainId={domainId}
        />
      </div>

      {/* Subdomain Summary */}
      {subdomainStats.totalSubdomains > 0 && (
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

      {/* Recent Reports */}
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
    </div>
  );
}
