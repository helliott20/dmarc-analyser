import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, domains, sources, reports } from '@/db/schema';
import { eq, and, or, ilike, inArray, sql } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const query = url.searchParams.get('q')?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    // Get user's organizations
    const userOrgs = await db
      .select({ orgId: orgMembers.organizationId })
      .from(orgMembers)
      .where(eq(orgMembers.userId, session.user.id));

    if (userOrgs.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const orgIds = userOrgs.map(o => o.orgId);

    // Search domains
    const domainResults = await db
      .select({
        id: domains.id,
        domain: domains.domain,
        displayName: domains.displayName,
        orgId: domains.organizationId,
        orgSlug: organizations.slug,
      })
      .from(domains)
      .innerJoin(organizations, eq(domains.organizationId, organizations.id))
      .where(
        and(
          inArray(domains.organizationId, orgIds),
          or(
            ilike(domains.domain, `%${query}%`),
            ilike(domains.displayName, `%${query}%`)
          )
        )
      )
      .limit(5);

    // Search sources by IP or organization name
    const searchPattern = `%${query}%`;
    const sourceResults = await db
      .select({
        id: sources.id,
        sourceIp: sources.sourceIp,
        organization: sources.organization,
        domainId: sources.domainId,
        domain: domains.domain,
        orgSlug: organizations.slug,
      })
      .from(sources)
      .innerJoin(domains, eq(sources.domainId, domains.id))
      .innerJoin(organizations, eq(domains.organizationId, organizations.id))
      .where(
        and(
          inArray(domains.organizationId, orgIds),
          or(
            sql`CAST(${sources.sourceIp} AS TEXT) ILIKE ${searchPattern}`,
            ilike(sources.organization, searchPattern),
            ilike(sources.hostname, searchPattern)
          )
        )
      )
      .limit(5);

    // Search reports by org name
    const reportResults = await db
      .select({
        id: reports.id,
        orgName: reports.orgName,
        domainId: reports.domainId,
        domain: domains.domain,
        orgSlug: organizations.slug,
        dateRangeBegin: reports.dateRangeBegin,
      })
      .from(reports)
      .innerJoin(domains, eq(reports.domainId, domains.id))
      .innerJoin(organizations, eq(domains.organizationId, organizations.id))
      .where(
        and(
          inArray(domains.organizationId, orgIds),
          ilike(reports.orgName, `%${query}%`)
        )
      )
      .limit(5);

    const results = [
      ...domainResults.map(d => ({
        type: 'domain' as const,
        id: d.id,
        title: d.domain,
        subtitle: d.displayName || 'Domain',
        url: `/orgs/${d.orgSlug}/domains/${d.id}`,
      })),
      ...sourceResults.map(s => ({
        type: 'source' as const,
        id: s.id,
        title: s.sourceIp,
        subtitle: s.organization || s.domain,
        url: `/orgs/${s.orgSlug}/domains/${s.domainId}/sources`,
      })),
      ...reportResults.map(r => ({
        type: 'report' as const,
        id: r.id,
        title: r.orgName,
        subtitle: `${r.domain} - ${new Date(r.dateRangeBegin).toLocaleDateString()}`,
        url: `/orgs/${r.orgSlug}/domains/${r.domainId}/reports/${r.id}`,
      })),
    ];

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
