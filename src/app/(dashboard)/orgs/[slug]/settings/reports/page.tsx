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
import { ScheduledReportsManager } from '@/components/reports/scheduled-reports-manager';
import { FileText, Info } from 'lucide-react';

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

export default async function ReportsSettingsPage({ params }: PageProps) {
  const { slug } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return notFound();
  }

  const result = await getOrgAndCheckAccess(slug, session.user.id);

  if (!result) {
    return notFound();
  }

  const { organization, role } = result;
  const canManage = ['owner', 'admin', 'member'].includes(role);

  if (!canManage) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Scheduled Reports</h1>
          <p className="text-muted-foreground">
            You don&apos;t have permission to manage scheduled reports
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Scheduled Reports</h1>
        <p className="text-muted-foreground">
          Configure automated email digests of your DMARC data for {organization.name}
        </p>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            About Scheduled Reports
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Scheduled reports allow you to receive automated email summaries of your DMARC
            data. You can configure reports to be sent daily, weekly, or monthly to one or
            more email addresses.
          </p>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Report Features:</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
              <li>
                <strong>Flexible Scheduling:</strong> Choose daily, weekly, or monthly
                delivery with customizable time and timezone
              </li>
              <li>
                <strong>Domain Filtering:</strong> Create reports for specific domains or
                include all domains in your organization
              </li>
              <li>
                <strong>Customizable Content:</strong> Include or exclude charts,
                sources, and authentication failures based on your needs
              </li>
              <li>
                <strong>Multiple Recipients:</strong> Send reports to multiple email
                addresses at once
              </li>
              <li>
                <strong>Test Before Scheduling:</strong> Use the test button to preview
                what your recipients will receive
              </li>
            </ul>
          </div>

          <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-4 mt-4">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Best Practices
            </h4>
            <ul className="list-disc list-inside text-sm text-blue-800 dark:text-blue-200 space-y-1 ml-2">
              <li>Weekly reports are recommended for most organizations</li>
              <li>Schedule reports during business hours in your timezone</li>
              <li>Include key stakeholders and security team members as recipients</li>
              <li>Enable all content options for comprehensive monitoring</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Reports Manager */}
      <ScheduledReportsManager orgSlug={slug} orgId={organization.id} />
    </div>
  );
}
