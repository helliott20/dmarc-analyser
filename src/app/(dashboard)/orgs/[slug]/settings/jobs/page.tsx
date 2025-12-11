import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Info, Zap } from 'lucide-react';
import { JobsStatusDisplay } from '@/components/jobs/jobs-status-display';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getOrgAndCheckAccess(slug: string, userId: string) {
  const [result] = await db
    .select({
      organization: organizations,
      role: orgMembers.role,
    })
    .from(organizations)
    .innerJoin(orgMembers, eq(organizations.id, orgMembers.organizationId))
    .where(and(eq(organizations.slug, slug), eq(orgMembers.userId, userId)));

  return result;
}

export default async function JobsStatusPage({ params }: PageProps) {
  const { slug } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return notFound();
  }

  const result = await getOrgAndCheckAccess(slug, session.user.id);

  if (!result) {
    return notFound();
  }

  const { role } = result;
  const canManage = ['owner', 'admin'].includes(role);

  if (!canManage) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Background Jobs</h1>
          <p className="text-muted-foreground">
            You don&apos;t have permission to view job status
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Background Jobs</h1>
        <p className="text-muted-foreground">
          Monitor the status of recurring jobs and background tasks
        </p>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            About Background Jobs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            DMARC Analyser runs several background jobs to keep your data up-to-date
            and process incoming reports automatically.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Recurring Jobs:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li><strong>Gmail Sync:</strong> Every 15 minutes</li>
                <li><strong>DNS Check:</strong> Every 6 hours</li>
                <li><strong>Scheduled Reports:</strong> Hourly</li>
                <li><strong>Cleanup:</strong> Daily at 2am</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold">On-Demand Jobs:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li><strong>Report Parser:</strong> When reports are imported</li>
                <li><strong>IP Enrichment:</strong> For new source IPs</li>
                <li><strong>Webhook Delivery:</strong> When events occur</li>
                <li><strong>Data Export:</strong> When exports are requested</li>
              </ul>
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950/30 dark:border-blue-900">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
              Worker Required
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Background jobs require the worker container to be running. If jobs are
              not processing, check that the worker is healthy.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Jobs Status Display */}
      <JobsStatusDisplay orgSlug={slug} />
    </div>
  );
}
