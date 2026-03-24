import { notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, domains } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, BarChart3, AlertTriangle } from 'lucide-react';
import { TimelineCharts } from '@/components/domains/timeline-charts';
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

export default async function TimelinePage({ params }: PageProps) {
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
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/orgs/${slug}/domains/${domainId}`}>
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Timeline</h1>
        </div>
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
              <div>
                <p className="font-medium text-warning">
                  Domain verification required
                </p>
                <p className="text-sm text-warning/80 mt-1">
                  You need to verify ownership of this domain before viewing timeline data.
                  Go to the domain overview page to complete verification.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/orgs/${slug}/domains/${domainId}`}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Timeline</h1>
            <p className="text-sm text-muted-foreground">{domain.domain}</p>
          </div>
        </div>
        <ExportButton orgSlug={slug} domainId={domainId} />
      </div>

      {/* Charts */}
      <TimelineCharts orgSlug={slug} domainId={domainId} />
    </div>
  );
}
