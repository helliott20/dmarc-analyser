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
} from '@/db/schema';
import { eq, and, desc, sql, count, sum } from 'drizzle-orm';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Mail,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';
import { ExportButton } from '@/components/export-button';

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

async function getReportsWithStats(domainId: string) {
  const reportsData = await db
    .select({
      id: reports.id,
      reportId: reports.reportId,
      orgName: reports.orgName,
      email: reports.email,
      dateRangeBegin: reports.dateRangeBegin,
      dateRangeEnd: reports.dateRangeEnd,
      policyP: reports.policyP,
      importedAt: reports.importedAt,
    })
    .from(reports)
    .where(eq(reports.domainId, domainId))
    .orderBy(desc(reports.dateRangeEnd))
    .limit(100);

  // Get stats for each report
  const reportsWithStats = await Promise.all(
    reportsData.map(async (report) => {
      const [stats] = await db
        .select({
          totalMessages: sum(records.count),
          recordCount: count(),
        })
        .from(records)
        .where(eq(records.reportId, report.id));

      // Get pass/fail counts
      const [passStats] = await db
        .select({
          passedDkim: sql<number>`SUM(CASE WHEN ${records.dmarcDkim} = 'pass' THEN ${records.count} ELSE 0 END)`,
          passedSpf: sql<number>`SUM(CASE WHEN ${records.dmarcSpf} = 'pass' THEN ${records.count} ELSE 0 END)`,
          total: sum(records.count),
        })
        .from(records)
        .where(eq(records.reportId, report.id));

      const totalMessages = Number(stats?.totalMessages) || 0;
      const passedDkim = Number(passStats?.passedDkim) || 0;
      const passedSpf = Number(passStats?.passedSpf) || 0;
      const passedEither = Math.max(passedDkim, passedSpf); // Approximate
      const passRate = totalMessages > 0 ? (passedEither / totalMessages) * 100 : 0;

      return {
        ...report,
        totalMessages,
        recordCount: Number(stats?.recordCount) || 0,
        passRate: Math.round(passRate),
      };
    })
  );

  return reportsWithStats;
}

export default async function ReportsPage({ params }: PageProps) {
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

  // Check if domain is verified - redirect to domain page if not
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
                  You need to verify ownership of this domain before viewing report data.
                  Go to the domain overview page to complete verification.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const reportsData = await getReportsWithStats(domainId);

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
              <Link href={`/orgs/${slug}/domains/${domainId}`}>{domain.domain}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Reports</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">DMARC Reports</h1>
          <p className="text-muted-foreground">
            Aggregate reports received for {domain.domain}
          </p>
        </div>
        <ExportButton orgSlug={slug} domainId={domainId} />
      </div>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Reports</CardTitle>
          <CardDescription>
            {reportsData.length} reports received
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reportsData.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No reports yet</h3>
              <p className="text-muted-foreground">
                Reports will appear here once email providers start sending them.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Date Range</TableHead>
                  <TableHead className="text-right">Messages</TableHead>
                  <TableHead className="text-right">Pass Rate</TableHead>
                  <TableHead className="text-right">Policy</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportsData.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{report.orgName}</p>
                        <p className="text-sm text-muted-foreground">
                          {report.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>
                          {new Date(report.dateRangeBegin).toLocaleDateString()}
                        </p>
                        <p className="text-muted-foreground">
                          to {new Date(report.dateRangeEnd).toLocaleDateString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div>
                        <p className="font-medium">
                          {report.totalMessages.toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {report.recordCount} sources
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {report.passRate >= 90 ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : report.passRate >= 70 ? (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span
                          className={
                            report.passRate >= 90
                              ? 'text-green-600'
                              : report.passRate >= 70
                              ? 'text-yellow-600'
                              : 'text-red-600'
                          }
                        >
                          {report.passRate}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={
                          report.policyP === 'reject'
                            ? 'default'
                            : report.policyP === 'quarantine'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {report.policyP || 'none'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          href={`/orgs/${slug}/domains/${domainId}/reports/${report.id}`}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
