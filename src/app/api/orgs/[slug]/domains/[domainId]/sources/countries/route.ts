import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, domains, sources } from '@/db/schema';
import { eq, and, sql, gte } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ slug: string; domainId: string }>;
}

async function getDomainWithAccess(domainId: string, orgSlug: string, userId: string) {
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

// GET /api/orgs/[slug]/domains/[domainId]/sources/countries - Get sources aggregated by country
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug, domainId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const result = await getDomainWithAccess(domainId, slug, session.user.id);

    if (!result) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    // Check if domain is verified
    if (!result.domain.verifiedAt) {
      return NextResponse.json({ error: 'Domain not verified' }, { status: 403 });
    }

    // Get time range from query params (default to last 30 days)
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    const days = daysParam ? parseInt(daysParam, 10) : 30;

    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    // Aggregate sources by country
    const countryStats = await db
      .select({
        country: sources.country,
        sourceCount: sql<number>`count(*)`.as('source_count'),
        totalMessages: sql<number>`sum(${sources.totalMessages})`.as('total_messages'),
        passedMessages: sql<number>`sum(${sources.passedMessages})`.as('passed_messages'),
        failedMessages: sql<number>`sum(${sources.failedMessages})`.as('failed_messages'),
      })
      .from(sources)
      .where(
        and(
          eq(sources.domainId, domainId),
          gte(sources.lastSeen, dateThreshold)
        )
      )
      .groupBy(sources.country)
      .orderBy(sql`sum(${sources.totalMessages}) DESC`);

    // Filter out null countries and format response
    const countries = countryStats
      .filter((c) => c.country !== null)
      .map((c) => ({
        country: c.country!,
        sourceCount: Number(c.sourceCount),
        totalMessages: Number(c.totalMessages),
        passedMessages: Number(c.passedMessages),
        failedMessages: Number(c.failedMessages),
      }));

    // Calculate totals
    const totals = countries.reduce(
      (acc, c) => ({
        sourceCount: acc.sourceCount + c.sourceCount,
        totalMessages: acc.totalMessages + c.totalMessages,
        passedMessages: acc.passedMessages + c.passedMessages,
        failedMessages: acc.failedMessages + c.failedMessages,
      }),
      { sourceCount: 0, totalMessages: 0, passedMessages: 0, failedMessages: 0 }
    );

    // Count sources with unknown country
    const unknownCountry = countryStats.find((c) => c.country === null);
    const unknownStats = unknownCountry
      ? {
          sourceCount: Number(unknownCountry.sourceCount),
          totalMessages: Number(unknownCountry.totalMessages),
          passedMessages: Number(unknownCountry.passedMessages),
          failedMessages: Number(unknownCountry.failedMessages),
        }
      : null;

    return NextResponse.json({
      countries,
      totals,
      unknownStats,
      period: `${days} days`,
    });
  } catch (error) {
    console.error('Error fetching country stats:', error);
    return NextResponse.json({ error: 'Failed to fetch country statistics' }, { status: 500 });
  }
}
