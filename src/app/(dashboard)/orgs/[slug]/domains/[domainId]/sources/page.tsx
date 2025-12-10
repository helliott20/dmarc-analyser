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
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Server,
  MapPin,
  Shield,
} from 'lucide-react';
import { SourcesEnrichment } from '@/components/domains/sources-enrichment';
import { AutoMatchButton } from '@/components/sources/auto-match-button';
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

function getSourceTypeBadge(type: string) {
  switch (type) {
    case 'legitimate':
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-700">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Legitimate
        </Badge>
      );
    case 'suspicious':
      return (
        <Badge variant="secondary" className="bg-red-100 text-red-700">
          <XCircle className="h-3 w-3 mr-1" />
          Suspicious
        </Badge>
      );
    case 'forwarded':
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
          Forwarded
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Unknown
        </Badge>
      );
  }
}

export default async function SourcesPage({ params }: PageProps) {
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
  const sourcesData = await getDomainSources(domainId);

  // Calculate stats
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
  const unenrichedSources = sourcesData.filter(
    (s) => !s.source.country && !s.source.organization
  ).length;
  const matchedSources = sourcesData.filter(
    (s) => s.knownSender !== null
  ).length;

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

      {/* Sources Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Sources</CardTitle>
              <CardDescription>
                {matchedSources > 0 && (
                  <span className="text-green-600">
                    {matchedSources} of {totalSources} matched to known senders
                  </span>
                )}
                {matchedSources === 0 && totalSources > 0 && (
                  <span>Sources that send email for this domain</span>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sourcesData.length === 0 ? (
            <div className="text-center py-12">
              <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No sources yet</h3>
              <p className="text-muted-foreground">
                Sources will appear here once DMARC reports are imported.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source IP</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Known Sender</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Passed</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Seen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sourcesData.map(({ source, knownSender }) => {
                  const passRate =
                    Number(source.totalMessages) > 0
                      ? (Number(source.passedMessages) /
                          Number(source.totalMessages)) *
                        100
                      : 0;

                  return (
                    <TableRow key={source.id}>
                      <TableCell>
                        <div>
                          <code className="text-sm font-medium">
                            {source.sourceIp}
                          </code>
                          {source.hostname && (
                            <p className="text-xs text-muted-foreground">
                              {source.hostname}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {source.organization || 'Unknown'}
                          </p>
                          {source.asn && (
                            <p className="text-xs text-muted-foreground">
                              {source.asn}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {knownSender ? (
                          <div className="flex items-center gap-2">
                            {knownSender.logoUrl && (
                              <img
                                src={knownSender.logoUrl}
                                alt={knownSender.name}
                                className="h-4 w-4 rounded object-contain"
                              />
                            )}
                            <div>
                              <p className="font-medium text-sm">
                                {knownSender.name}
                              </p>
                              {knownSender.isGlobal && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs h-4 px-1"
                                >
                                  <Shield className="h-2 w-2 mr-1" />
                                  Global
                                </Badge>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {source.country ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span>
                              {source.city && `${source.city}, `}
                              {source.country}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Unknown</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {Number(source.totalMessages).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {Number(source.passedMessages).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {Number(source.failedMessages).toLocaleString()}
                      </TableCell>
                      <TableCell>{getSourceTypeBadge(source.sourceType)}</TableCell>
                      <TableCell>
                        {source.lastSeen ? (
                          <span className="text-sm text-muted-foreground">
                            {new Date(source.lastSeen).toLocaleDateString()}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
