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
  dkimResults,
  spfResults,
  sources,
  knownSenders,
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  CheckCircle2,
  XCircle,
  Mail,
  Calendar,
  Shield,
  Server,
  AlertTriangle,
} from 'lucide-react';

interface PageProps {
  params: Promise<{ slug: string; domainId: string; reportId: string }>;
}

async function getReportWithAccess(
  reportId: string,
  domainId: string,
  orgSlug: string,
  userId: string
) {
  const [result] = await db
    .select({
      report: reports,
      domain: domains,
      organization: organizations,
      role: orgMembers.role,
    })
    .from(reports)
    .innerJoin(domains, eq(reports.domainId, domains.id))
    .innerJoin(organizations, eq(domains.organizationId, organizations.id))
    .innerJoin(orgMembers, eq(organizations.id, orgMembers.organizationId))
    .where(
      and(
        eq(reports.id, reportId),
        eq(reports.domainId, domainId),
        eq(organizations.slug, orgSlug),
        eq(orgMembers.userId, userId)
      )
    );

  return result;
}

async function getReportRecords(reportId: string, domainId: string) {
  const recordsData = await db
    .select()
    .from(records)
    .where(eq(records.reportId, reportId))
    .orderBy(records.count);

  // Get auth results and source info for each record
  const recordsWithAuth = await Promise.all(
    recordsData.map(async (record) => {
      const [dkimData, spfData, sourceData] = await Promise.all([
        db.select().from(dkimResults).where(eq(dkimResults.recordId, record.id)),
        db.select().from(spfResults).where(eq(spfResults.recordId, record.id)),
        db
          .select({
            source: sources,
            knownSender: knownSenders,
          })
          .from(sources)
          .leftJoin(knownSenders, eq(sources.knownSenderId, knownSenders.id))
          .where(
            and(
              eq(sources.domainId, domainId),
              eq(sources.sourceIp, record.sourceIp)
            )
          )
          .limit(1),
      ]);

      return {
        ...record,
        dkimResults: dkimData,
        spfResults: spfData,
        source: sourceData[0]?.source || null,
        knownSender: sourceData[0]?.knownSender || null,
      };
    })
  );

  return recordsWithAuth;
}

function getResultBadge(result: string | null | undefined) {
  if (result === 'pass') {
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-700">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Pass
      </Badge>
    );
  }
  if (result === 'fail') {
    return (
      <Badge variant="secondary" className="bg-red-100 text-red-700">
        <XCircle className="h-3 w-3 mr-1" />
        Fail
      </Badge>
    );
  }
  return (
    <Badge variant="outline">
      {result || 'N/A'}
    </Badge>
  );
}

export default async function ReportDetailPage({ params }: PageProps) {
  const { slug, domainId, reportId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return notFound();
  }

  const result = await getReportWithAccess(
    reportId,
    domainId,
    slug,
    session.user.id
  );

  if (!result) {
    return notFound();
  }

  const { report, domain } = result;

  // Check if domain is verified - show verification message if not
  if (!domain.verifiedAt) {
    return (
      <div className="space-y-6">
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
              <BreadcrumbPage>Report</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  Domain verification required
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  You need to verify ownership of this domain before viewing report details.
                  Go to the domain overview page to complete verification.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const recordsData = await getReportRecords(reportId, domainId);

  // Calculate stats
  const totalMessages = recordsData.reduce((sum, r) => sum + r.count, 0);
  const passedMessages = recordsData.reduce(
    (sum, r) =>
      sum + (r.dmarcDkim === 'pass' || r.dmarcSpf === 'pass' ? r.count : 0),
    0
  );
  const passRate = totalMessages > 0 ? (passedMessages / totalMessages) * 100 : 0;

  return (
    <TooltipProvider>
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
              <BreadcrumbLink asChild>
                <Link href={`/orgs/${slug}/domains/${domainId}/reports`}>Reports</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{report.orgName}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Report from {report.orgName}
            </h1>
            <p className="text-muted-foreground">
              {new Date(report.dateRangeBegin).toLocaleDateString()} -{' '}
              {new Date(report.dateRangeEnd).toLocaleDateString()}
            </p>
          </div>
          <Badge
            variant={
              passRate >= 90
                ? 'default'
                : passRate >= 70
                ? 'secondary'
                : 'destructive'
            }
            className="text-lg px-4 py-1"
          >
            {Math.round(passRate)}% Pass
          </Badge>
        </div>

        {/* Report Info Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Total Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalMessages.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Server className="h-4 w-4" />
                Unique Sources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{recordsData.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Policy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge
                variant={
                  report.policyP === 'reject'
                    ? 'default'
                    : report.policyP === 'quarantine'
                    ? 'secondary'
                    : 'outline'
                }
                className="text-lg"
              >
                {report.policyP || 'none'}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Imported
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                {new Date(report.importedAt).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Records Table */}
        <Card>
          <CardHeader>
            <CardTitle>Source Details</CardTitle>
            <CardDescription>
              Email sources and authentication results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source IP</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead>Disposition</TableHead>
                  <TableHead>DMARC DKIM</TableHead>
                  <TableHead>DMARC SPF</TableHead>
                  <TableHead>DKIM Details</TableHead>
                  <TableHead>SPF Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recordsData.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {record.knownSender?.logoUrl && (
                          <Tooltip>
                            <TooltipTrigger>
                              <img
                                src={record.knownSender.logoUrl}
                                alt={record.knownSender.name}
                                className="h-5 w-5 rounded object-contain flex-shrink-0"
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{record.knownSender.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link
                                href={`/orgs/${slug}/domains/${domainId}/sources`}
                                className="hover:underline"
                              >
                                <code className="text-sm font-medium hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
                                  {record.sourceIp}
                                </code>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{record.knownSender?.name || record.source?.organization || 'Unknown source'}</p>
                            </TooltipContent>
                          </Tooltip>
                          {record.headerFrom && (
                            <p className="text-xs text-muted-foreground">
                              From: {record.headerFrom}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {record.count.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          record.disposition === 'none'
                            ? 'outline'
                            : record.disposition === 'quarantine'
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {record.disposition}
                      </Badge>
                    </TableCell>
                    <TableCell>{getResultBadge(record.dmarcDkim)}</TableCell>
                    <TableCell>{getResultBadge(record.dmarcSpf)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {record.dkimResults.map((dkim, i) => (
                          <Tooltip key={i}>
                            <TooltipTrigger>
                              <Badge
                                variant="outline"
                                className={
                                  dkim.result === 'pass'
                                    ? 'border-green-500'
                                    : dkim.result === 'fail'
                                    ? 'border-red-500'
                                    : ''
                                }
                              >
                                {dkim.domain}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Result: {dkim.result}</p>
                              {dkim.selector && <p>Selector: {dkim.selector}</p>}
                            </TooltipContent>
                          </Tooltip>
                        ))}
                        {record.dkimResults.length === 0 && (
                          <span className="text-muted-foreground text-sm">
                            None
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {record.spfResults.map((spf, i) => (
                          <Tooltip key={i}>
                            <TooltipTrigger>
                              <Badge
                                variant="outline"
                                className={
                                  spf.result === 'pass'
                                    ? 'border-green-500'
                                    : spf.result === 'fail'
                                    ? 'border-red-500'
                                    : ''
                                }
                              >
                                {spf.domain}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Result: {spf.result}</p>
                              {spf.scope && <p>Scope: {spf.scope}</p>}
                            </TooltipContent>
                          </Tooltip>
                        ))}
                        {record.spfResults.length === 0 && (
                          <span className="text-muted-foreground text-sm">
                            None
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Policy Info */}
        <Card>
          <CardHeader>
            <CardTitle>Policy Published</CardTitle>
            <CardDescription>
              DMARC policy in effect during this reporting period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Domain Policy (p)</p>
                <p className="font-medium">{report.policyP || 'none'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Subdomain Policy (sp)
                </p>
                <p className="font-medium">{report.policySp || 'inherit'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Percentage (pct)</p>
                <p className="font-medium">{report.policyPct ?? 100}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  DKIM Alignment (adkim)
                </p>
                <p className="font-medium">
                  {report.policyAdkim === 's' ? 'Strict' : 'Relaxed'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  SPF Alignment (aspf)
                </p>
                <p className="font-medium">
                  {report.policyAspf === 's' ? 'Strict' : 'Relaxed'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reporter Email</p>
                <p className="font-medium">{report.email || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
