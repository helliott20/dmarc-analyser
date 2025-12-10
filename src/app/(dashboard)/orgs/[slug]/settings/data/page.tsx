import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, domains } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DataExportSection } from '@/components/data/data-export-section';
import { DataRetentionSection } from '@/components/data/data-retention-section';
import { DataDeletionSection } from '@/components/data/data-deletion-section';
import { Info, Database } from 'lucide-react';

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

async function getDomains(organizationId: string) {
  return await db
    .select({
      id: domains.id,
      domain: domains.domain,
      displayName: domains.displayName,
    })
    .from(domains)
    .where(eq(domains.organizationId, organizationId))
    .orderBy(domains.domain);
}

export default async function DataManagementPage({ params }: PageProps) {
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
  const canManage = ['owner', 'admin'].includes(role);

  if (!canManage) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data Management</h1>
          <p className="text-muted-foreground">
            You don&apos;t have permission to manage data
          </p>
        </div>
      </div>
    );
  }

  const orgDomains = await getDomains(organization.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Data Management</h1>
        <p className="text-muted-foreground">
          Export your data, manage retention settings, and control your organization&apos;s data
        </p>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            About Data Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This page allows you to manage all data related to your organization. You can export
            your data in CSV format, view retention settings, and delete data as needed.
          </p>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Available Export Types:</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
              <li>
                <strong>Reports:</strong> All DMARC aggregate reports with detailed records
              </li>
              <li>
                <strong>Sources:</strong> All email sources with geolocation and classification data
              </li>
              <li>
                <strong>Timeline:</strong> Daily aggregated statistics and trends
              </li>
              <li>
                <strong>Full Export:</strong> Combined export of all data types (coming soon)
              </li>
            </ul>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-semibold text-blue-900 mb-1">
              Export Retention
            </p>
            <p className="text-sm text-blue-800">
              Exports are kept for 7 days after creation. After that, they are automatically
              deleted. You can download the same data multiple times within this period.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Data Export Section */}
      <DataExportSection
        orgSlug={slug}
        organizationId={organization.id}
        domains={orgDomains}
      />

      {/* Data Retention Section */}
      <DataRetentionSection
        orgSlug={slug}
        organizationId={organization.id}
        dataRetentionDays={organization.dataRetentionDays || 365}
      />

      {/* Data Deletion Section (GDPR/Privacy) */}
      <DataDeletionSection
        orgSlug={slug}
        organizationName={organization.name}
        isOwner={role === 'owner'}
      />
    </div>
  );
}
