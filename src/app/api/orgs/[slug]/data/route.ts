import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import {
  organizations,
  orgMembers,
  domains,
  reports,
  records,
  sources,
  forensicReports,
  dataExports,
  alerts,
} from '@/db/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

async function getOrganizationWithAccess(orgSlug: string, userId: string) {
  const [result] = await db
    .select({
      organization: organizations,
      role: orgMembers.role,
    })
    .from(organizations)
    .innerJoin(orgMembers, eq(organizations.id, orgMembers.organizationId))
    .where(
      and(eq(organizations.slug, orgSlug), eq(orgMembers.userId, userId))
    );

  return result;
}

// GET /api/orgs/[slug]/data - Get data statistics
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug } = await params;

    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await getOrganizationWithAccess(slug, session.user.id);

    if (!result) {
      return new Response(
        JSON.stringify({ error: 'Organization not found or insufficient permissions' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { organization } = result;

    // Get all domains for this organization
    const orgDomains = await db
      .select({ id: domains.id })
      .from(domains)
      .where(eq(domains.organizationId, organization.id));

    const domainIds = orgDomains.map(d => d.id);

    if (domainIds.length === 0) {
      return new Response(
        JSON.stringify({
          totalReports: 0,
          totalRecords: 0,
          totalSources: 0,
          totalAlerts: 0,
          oldestDataDate: null,
          storageEstimateMB: 0,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Count reports
    const [reportCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reports)
      .where(inArray(reports.domainId, domainIds));

    // Count records
    const reportIds = await db
      .select({ id: reports.id })
      .from(reports)
      .where(inArray(reports.domainId, domainIds));

    const reportIdList = reportIds.map(r => r.id);
    let recordCount = { count: 0 };

    if (reportIdList.length > 0) {
      [recordCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(records)
        .where(inArray(records.reportId, reportIdList));
    }

    // Count sources
    const [sourceCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sources)
      .where(inArray(sources.domainId, domainIds));

    // Count alerts
    const [alertCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(alerts)
      .where(eq(alerts.organizationId, organization.id));

    // Get oldest data date
    const [oldestReport] = await db
      .select({ dateRangeBegin: reports.dateRangeBegin })
      .from(reports)
      .where(inArray(reports.domainId, domainIds))
      .orderBy(reports.dateRangeBegin)
      .limit(1);

    // Rough storage estimate (very approximate)
    // Assume: avg report ~10KB, record ~1KB, source ~2KB
    const storageEstimateMB = Math.round(
      (reportCount.count * 10 + recordCount.count * 1 + sourceCount.count * 2) / 1024
    );

    return new Response(
      JSON.stringify({
        totalReports: reportCount.count,
        totalRecords: recordCount.count,
        totalSources: sourceCount.count,
        totalAlerts: alertCount.count,
        oldestDataDate: oldestReport?.dateRangeBegin || null,
        storageEstimateMB,
        dataRetentionDays: organization.dataRetentionDays,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Failed to fetch data statistics:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch data statistics' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// DELETE /api/orgs/[slug]/data - Delete all organization data (GDPR)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug } = await params;

    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await getOrganizationWithAccess(slug, session.user.id);

    if (!result) {
      return new Response(
        JSON.stringify({ error: 'Organization not found or insufficient permissions' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { organization, role } = result;

    // Only owners can delete all data
    if (role !== 'owner') {
      return new Response(
        JSON.stringify({ error: 'Only organization owners can delete all data' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify organization name in request body
    const body = await request.json();
    const { confirmationName } = body;

    if (confirmationName !== organization.name) {
      return new Response(
        JSON.stringify({ error: 'Organization name confirmation does not match' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Delete all data in a transaction
    // Note: Due to cascade deletes in the schema, deleting domains will automatically
    // delete reports, records, sources, forensic reports, etc.

    await db.transaction(async (tx) => {
      // Get all domain IDs
      const orgDomains = await tx
        .select({ id: domains.id })
        .from(domains)
        .where(eq(domains.organizationId, organization.id));

      const domainIds = orgDomains.map(d => d.id);

      if (domainIds.length > 0) {
        // Delete domains (cascade will handle reports, records, sources, etc.)
        await tx.delete(domains).where(inArray(domains.id, domainIds));
      }

      // Delete organization-level data
      await tx.delete(alerts).where(eq(alerts.organizationId, organization.id));
      await tx.delete(dataExports).where(eq(dataExports.organizationId, organization.id));
    });

    return new Response(
      JSON.stringify({
        message: 'All organization data has been successfully deleted',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Failed to delete organization data:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to delete organization data' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
