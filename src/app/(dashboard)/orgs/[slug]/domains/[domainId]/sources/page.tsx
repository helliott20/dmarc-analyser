import { notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import {
  organizations,
  orgMembers,
  domains,
  sources,
  knownSenders,
} from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertTriangle,
} from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { SourcesEnrichment } from '@/components/domains/sources-enrichment';
import { AutoMatchButton } from '@/components/sources/auto-match-button';
import { SourcesFilterBar, type SourceFilter } from '@/components/sources/sources-filter-bar';
import { ExportButton } from '@/components/export-button';
import { SourcesWorldMap } from '@/components/maps/sources-world-map';
import { SourcesTable } from '@/components/sources/sources-table';

const FAIL_THRESHOLD = 0.5; // 50% pass rate threshold for "failing" filter

interface PageProps {
  params: Promise<{ slug: string; domainId: string }>;
  searchParams: Promise<{ filter?: string }>;
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

async function getDomainSources(domainId: string) {
  return db
    .select({
      source: sources,
      knownSender: knownSenders,
    })
    .from(sources)
    .leftJoin(knownSenders, eq(sources.knownSenderId, knownSenders.id))
    .where(eq(sources.domainId, domainId))
    .orderBy(desc(sources.totalMessages));
}


export default async function SourcesPage({ params, searchParams }: PageProps) {
  const { slug, domainId } = await params;
  const { filter } = await searchParams;
  const currentFilter = (filter as SourceFilter) || 'all';
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
              <BreadcrumbPage>Sources</BreadcrumbPage>
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
                  You need to verify ownership of this domain before viewing source data.
                  Go to the domain overview page to complete verification.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sourcesData = await getDomainSources(domainId);

  // Helper to check if source is failing
  const isSourceFailing = (source: typeof sourcesData[0]['source']) => {
    const total = Number(source.totalMessages);
    const passed = Number(source.passedMessages);
    return total > 0 && passed / total < FAIL_THRESHOLD;
  };

  // Calculate stats and filter counts
  const totalSources = sourcesData.length;
  const legitimateSources = sourcesData.filter(
    (s) => s.source.sourceType === 'legitimate'
  ).length;
  const unknownSources = sourcesData.filter(
    (s) => s.source.sourceType === 'unknown'
  ).length;
  const suspiciousSources = sourcesData.filter(
    (s) => s.source.sourceType === 'suspicious'
  ).length;
  const forwardedSources = sourcesData.filter(
    (s) => s.source.sourceType === 'forwarded'
  ).length;
  const failingSources = sourcesData.filter(
    (s) => isSourceFailing(s.source)
  ).length;
  const unenrichedSources = sourcesData.filter(
    (s) => !s.source.country && !s.source.organization
  ).length;
  const matchedSources = sourcesData.filter(
    (s) => s.knownSender !== null
  ).length;

  // Filter counts for the filter bar
  const filterCounts = {
    all: totalSources,
    legitimate: legitimateSources,
    suspicious: suspiciousSources,
    unknown: unknownSources,
    forwarded: forwardedSources,
    failing: failingSources,
  };

  // Apply filter
  const filteredSources = currentFilter === 'all'
    ? sourcesData
    : currentFilter === 'failing'
      ? sourcesData.filter((s) => isSourceFailing(s.source))
      : sourcesData.filter((s) => s.source.sourceType === currentFilter);

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
            <BreadcrumbPage>Sources</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Email Sources</h1>
          <p className="text-muted-foreground">
            All IP addresses that have sent email for {domain.domain}
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton orgSlug={slug} domainId={domainId} />
          <AutoMatchButton orgSlug={slug} domainId={domainId} />
          <SourcesEnrichment
            orgSlug={slug}
            domainId={domainId}
            unenrichedCount={unenrichedSources}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalSources}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">
              Legitimate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{legitimateSources}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">
              Unknown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{unknownSources}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">
              Suspicious
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{suspiciousSources}</p>
          </CardContent>
        </Card>
      </div>

      {/* Geographic Map */}
      <SourcesWorldMap orgSlug={slug} domainId={domainId} />

      {/* Filter Bar */}
      <SourcesFilterBar counts={filterCounts} />

      {/* Sources Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {currentFilter === 'all' ? 'All Sources' : `${currentFilter.charAt(0).toUpperCase() + currentFilter.slice(1)} Sources`}
              </CardTitle>
              <CardDescription>
                {currentFilter !== 'all' && (
                  <span>
                    Showing {filteredSources.length} of {totalSources} sources
                  </span>
                )}
                {currentFilter === 'all' && matchedSources > 0 && (
                  <span className="text-green-600">
                    {matchedSources} of {totalSources} matched to known senders
                  </span>
                )}
                {currentFilter === 'all' && matchedSources === 0 && totalSources > 0 && (
                  <span>Sources that send email for this domain</span>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SourcesTable
            sources={filteredSources.map(({ source, knownSender }) => ({
              source: {
                id: source.id,
                sourceIp: source.sourceIp,
                hostname: source.hostname,
                organization: source.organization,
                country: source.country,
                city: source.city,
                asn: source.asn,
                sourceType: source.sourceType,
                totalMessages: Number(source.totalMessages),
                passedMessages: Number(source.passedMessages),
                failedMessages: Number(source.failedMessages),
                lastSeen: source.lastSeen?.toISOString() || null,
              },
              knownSender: knownSender
                ? {
                    id: knownSender.id,
                    name: knownSender.name,
                    logoUrl: knownSender.logoUrl,
                    isGlobal: knownSender.isGlobal,
                  }
                : null,
            }))}
            orgSlug={slug}
            domainId={domainId}
            emptyMessage={sourcesData.length === 0 ? 'No sources yet' : 'No matching sources'}
            emptyDescription={
              sourcesData.length === 0
                ? 'Sources will appear here once DMARC reports are imported.'
                : 'Try changing your filter to see more sources.'
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
