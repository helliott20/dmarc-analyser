import { notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import {
  organizations,
  orgMembers,
  domains,
  subdomains,
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
  Globe,
} from 'lucide-react';
import { SubdomainPolicySelector } from '@/components/subdomains/subdomain-policy-selector';

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

async function getDomainSubdomains(domainId: string) {
  return db
    .select({
      id: subdomains.id,
      subdomain: subdomains.subdomain,
      policyOverride: subdomains.policyOverride,
      firstSeen: subdomains.firstSeen,
      lastSeen: subdomains.lastSeen,
      messageCount: subdomains.messageCount,
      passCount: subdomains.passCount,
      failCount: subdomains.failCount,
    })
    .from(subdomains)
    .where(eq(subdomains.domainId, domainId))
    .orderBy(desc(subdomains.messageCount));
}

function getPassRateBadge(passRate: number) {
  if (passRate >= 95) {
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-700">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        {passRate.toFixed(1)}%
      </Badge>
    );
  } else if (passRate >= 80) {
    return (
      <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
        <AlertTriangle className="h-3 w-3 mr-1" />
        {passRate.toFixed(1)}%
      </Badge>
    );
  } else {
    return (
      <Badge variant="secondary" className="bg-red-100 text-red-700">
        <XCircle className="h-3 w-3 mr-1" />
        {passRate.toFixed(1)}%
      </Badge>
    );
  }
}

export default async function SubdomainsPage({ params }: PageProps) {
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
  const subdomainsList = await getDomainSubdomains(domainId);
  const canManage = ['owner', 'admin', 'member'].includes(role);

  // Calculate stats
  const subdomainsWithStats = subdomainsList.map((sub) => {
    const messageCount = Number(sub.messageCount);
    const passCount = Number(sub.passCount);
    const failCount = Number(sub.failCount);
    const passRate = messageCount > 0 ? (passCount / messageCount) * 100 : 0;

    return {
      ...sub,
      messageCount,
      passCount,
      failCount,
      passRate,
    };
  });

  const totalSubdomains = subdomainsWithStats.length;
  const lowPassRateSubdomains = subdomainsWithStats.filter(
    (sub) => sub.passRate < 80 && sub.messageCount > 0
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/orgs/${slug}/domains/${domainId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Domain
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Globe className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subdomains</h1>
          <p className="text-muted-foreground">
            Manage subdomains for {domain.domain}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Subdomains
            </CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubdomains}</div>
            <p className="text-xs text-muted-foreground">
              Discovered from DMARC reports
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Subdomains with Low Pass Rate
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowPassRateSubdomains}</div>
            <p className="text-xs text-muted-foreground">
              Pass rate below 80%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subdomains Table */}
      <Card>
        <CardHeader>
          <CardTitle>Subdomain List</CardTitle>
          <CardDescription>
            All subdomains discovered from DMARC reports. Set policy overrides
            to control how these subdomains are evaluated.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subdomainsWithStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No subdomains discovered yet</p>
              <p className="text-sm mt-2">
                Subdomains will appear here once DMARC reports are imported
              </p>
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subdomain</TableHead>
                    <TableHead className="text-right">Messages</TableHead>
                    <TableHead className="text-right">Pass Rate</TableHead>
                    <TableHead>Policy Override</TableHead>
                    <TableHead>First Seen</TableHead>
                    <TableHead>Last Seen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subdomainsWithStats.map((subdomain) => (
                    <TableRow key={subdomain.id}>
                      <TableCell className="font-medium">
                        {subdomain.subdomain}
                      </TableCell>
                      <TableCell className="text-right">
                        {subdomain.messageCount.toLocaleString()}
                        <div className="text-xs text-muted-foreground">
                          {subdomain.passCount.toLocaleString()} pass /{' '}
                          {subdomain.failCount.toLocaleString()} fail
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {getPassRateBadge(subdomain.passRate)}
                      </TableCell>
                      <TableCell>
                        {canManage ? (
                          <SubdomainPolicySelector
                            subdomainId={subdomain.id}
                            currentPolicy={subdomain.policyOverride}
                            orgSlug={slug}
                            domainId={domainId}
                          />
                        ) : (
                          <Badge variant="outline">
                            {subdomain.policyOverride || 'None'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(subdomain.firstSeen).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(subdomain.lastSeen).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
