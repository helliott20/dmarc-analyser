import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, domains, sources } from '@/db/schema';
import { eq, and, isNull, or } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ slug: string; domainId: string }>;
}

interface IpApiResponse {
  status: string;
  country: string;
  countryCode: string;
  region: string;
  regionName: string;
  city: string;
  isp: string;
  org: string;
  as: string;
  query: string;
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

async function lookupIp(ip: string): Promise<IpApiResponse | null> {
  try {
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,regionName,city,isp,org,as,query`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.status !== 'success') {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

// Rate limit: ip-api.com allows 45 requests per minute for free tier
// We'll process in batches with delays
const BATCH_SIZE = 10;
const DELAY_BETWEEN_BATCHES = 15000; // 15 seconds between batches

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug, domainId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getDomainWithAccess(domainId, slug, session.user.id);

    if (!result) {
      return NextResponse.json(
        { error: 'Domain not found or insufficient permissions' },
        { status: 404 }
      );
    }

    // Check for specific source ID in request body
    let sourceId: string | undefined;
    try {
      const body = await request.json();
      sourceId = body.sourceId;
    } catch {
      // No body - enrich all
    }

    // Get sources that need enrichment
    let sourcesToEnrich;
    if (sourceId) {
      // Enrich single source
      sourcesToEnrich = await db
        .select()
        .from(sources)
        .where(
          and(
            eq(sources.id, sourceId),
            eq(sources.domainId, domainId)
          )
        );
    } else {
      // Enrich all sources missing geo data (limit to first batch)
      sourcesToEnrich = await db
        .select()
        .from(sources)
        .where(
          and(
            eq(sources.domainId, domainId),
            or(
              isNull(sources.country),
              isNull(sources.organization)
            )
          )
        )
        .limit(BATCH_SIZE);
    }

    if (sourcesToEnrich.length === 0) {
      return NextResponse.json({
        enriched: 0,
        remaining: 0,
        message: 'All sources already enriched',
      });
    }

    let enriched = 0;
    const errors: string[] = [];

    for (const source of sourcesToEnrich) {
      const ipData = await lookupIp(source.sourceIp);

      if (ipData) {
        await db
          .update(sources)
          .set({
            country: ipData.countryCode,
            city: ipData.city,
            region: ipData.regionName,
            organization: ipData.org || ipData.isp,
            asn: ipData.as?.split(' ')[0], // Extract just the AS number
            asnOrg: ipData.as?.replace(/^AS\d+\s*/, ''), // Extract org name after AS number
            updatedAt: new Date(),
          })
          .where(eq(sources.id, source.id));

        enriched++;
      } else {
        errors.push(source.sourceIp);
      }

      // Small delay between requests to respect rate limits
      if (sourcesToEnrich.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Check if there are more sources to enrich
    const [remainingCount] = await db
      .select({ count: sources.id })
      .from(sources)
      .where(
        and(
          eq(sources.domainId, domainId),
          or(
            isNull(sources.country),
            isNull(sources.organization)
          )
        )
      );

    // Count remaining (this is a simplified count)
    const remainingSources = await db
      .select()
      .from(sources)
      .where(
        and(
          eq(sources.domainId, domainId),
          or(
            isNull(sources.country),
            isNull(sources.organization)
          )
        )
      );

    return NextResponse.json({
      enriched,
      errors: errors.length,
      remaining: remainingSources.length,
      hasMore: remainingSources.length > 0,
      message: enriched > 0
        ? `Enriched ${enriched} source${enriched > 1 ? 's' : ''}`
        : 'No sources could be enriched',
    });
  } catch (error) {
    console.error('Failed to enrich sources:', error);
    return NextResponse.json(
      { error: 'Failed to enrich sources' },
      { status: 500 }
    );
  }
}
