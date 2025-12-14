import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import {
  organizations,
  orgMembers,
  domains,
  reports,
  records,
  sources,
  aiIntegrations,
} from '@/db/schema';
import { eq, and, gte, inArray } from 'drizzle-orm';
import {
  hashContext,
  checkRateLimit,
  incrementUsage,
  checkCooldown,
  getCachedRecommendation,
  cacheRecommendation,
  callGemini,
  recordError,
  clearError,
  type DmarcContext,
} from '@/lib/gemini';

interface RouteParams {
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

function parseDmarcPolicy(dmarcRecord: string | null): string {
  if (!dmarcRecord) return 'none';
  const match = dmarcRecord.match(/p=(\w+)/);
  if (!match) return 'none';
  const policy = match[1].toLowerCase();
  if (['none', 'quarantine', 'reject'].includes(policy)) {
    return policy;
  }
  return 'none';
}

async function buildContext(
  domain: typeof domains.$inferSelect,
  organizationId: string
): Promise<DmarcContext> {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get all reports for this domain
  const allReports = await db
    .select({
      id: reports.id,
      dateRangeBegin: reports.dateRangeBegin,
    })
    .from(reports)
    .where(eq(reports.domainId, domain.id));

  if (allReports.length === 0) {
    return {
      domain: domain.domain,
      dmarcRecord: domain.dmarcRecord,
      spfRecord: domain.spfRecord,
      currentPolicy: parseDmarcPolicy(domain.dmarcRecord),
      passRate7Days: 0,
      passRate30Days: 0,
      passRateAllTime: 0,
      totalMessages: 0,
      daysMonitored: 0,
      sources: { legitimate: 0, unknown: 0, suspicious: 0, forwarded: 0 },
    };
  }

  // Calculate days monitored
  const oldestReport = allReports.reduce((oldest, r) =>
    r.dateRangeBegin < oldest.dateRangeBegin ? r : oldest
  );
  const daysMonitored = Math.floor(
    (now.getTime() - new Date(oldestReport.dateRangeBegin).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  // Get all records
  const reportIds = allReports.map((r) => r.id);
  const allRecords =
    reportIds.length > 0
      ? await db
          .select({
            reportId: records.reportId,
            count: records.count,
            dmarcDkim: records.dmarcDkim,
            dmarcSpf: records.dmarcSpf,
          })
          .from(records)
          .where(inArray(records.reportId, reportIds))
      : [];

  // Create report date map
  const reportDateMap = new Map(
    allReports.map((r) => [r.id, r.dateRangeBegin])
  );

  // Calculate pass rates for different periods
  let total7Days = 0,
    passed7Days = 0;
  let total30Days = 0,
    passed30Days = 0;
  let totalAll = 0,
    passedAll = 0;

  for (const record of allRecords) {
    const isPassing =
      record.dmarcDkim === 'pass' || record.dmarcSpf === 'pass';
    const reportDate = reportDateMap.get(record.reportId);

    totalAll += record.count;
    if (isPassing) passedAll += record.count;

    if (reportDate && reportDate >= thirtyDaysAgo) {
      total30Days += record.count;
      if (isPassing) passed30Days += record.count;
    }

    if (reportDate && reportDate >= sevenDaysAgo) {
      total7Days += record.count;
      if (isPassing) passed7Days += record.count;
    }
  }

  const passRate7Days = total7Days > 0 ? (passed7Days / total7Days) * 100 : 0;
  const passRate30Days =
    total30Days > 0 ? (passed30Days / total30Days) * 100 : 0;
  const passRateAllTime = totalAll > 0 ? (passedAll / totalAll) * 100 : 0;

  // Get source classification counts
  const sourcesData = await db
    .select({
      sourceType: sources.sourceType,
      knownSenderId: sources.knownSenderId,
    })
    .from(sources)
    .where(eq(sources.domainId, domain.id));

  const sourceStats = {
    legitimate: 0,
    unknown: 0,
    suspicious: 0,
    forwarded: 0,
  };

  for (const source of sourcesData) {
    if (source.sourceType === 'legitimate' || source.knownSenderId) {
      sourceStats.legitimate++;
    } else if (source.sourceType === 'suspicious') {
      sourceStats.suspicious++;
    } else if (source.sourceType === 'forwarded') {
      sourceStats.forwarded++;
    } else {
      sourceStats.unknown++;
    }
  }

  return {
    domain: domain.domain,
    dmarcRecord: domain.dmarcRecord,
    spfRecord: domain.spfRecord,
    currentPolicy: parseDmarcPolicy(domain.dmarcRecord),
    passRate7Days,
    passRate30Days,
    passRateAllTime,
    totalMessages: totalAll,
    daysMonitored,
    sources: sourceStats,
  };
}

/**
 * GET /api/orgs/[slug]/domains/[domainId]/ai-recommendation
 * Get AI-powered policy recommendation (cached or fresh)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const { slug, domainId } = await params;
    const result = await getDomainWithAccess(domainId, slug, session.user.id);

    if (!result) {
      return NextResponse.json(
        { error: 'Domain not found or insufficient permissions' },
        { status: 404 }
      );
    }

    const { domain, organization } = result;

    // Check if AI is configured and enabled
    const [integration] = await db
      .select({
        isEnabled: aiIntegrations.isEnabled,
        geminiApiKey: aiIntegrations.geminiApiKey,
      })
      .from(aiIntegrations)
      .where(eq(aiIntegrations.organizationId, organization.id));

    if (!integration?.geminiApiKey || !integration.isEnabled) {
      return NextResponse.json({
        available: false,
        reason: !integration?.geminiApiKey
          ? 'not_configured'
          : 'disabled',
      });
    }

    // Build context and check cache
    const context = await buildContext(domain, organization.id);
    const contextHash = hashContext(context);

    // Try to get cached recommendation
    const cached = await getCachedRecommendation(domainId, contextHash);
    if (cached) {
      return NextResponse.json({
        available: true,
        recommendation: cached,
        source: 'cache',
      });
    }

    // Check rate limit status (don't consume, just check)
    const rateLimit = await checkRateLimit(organization.id);

    // Check cooldown status
    const cooldown = await checkCooldown(domainId);

    return NextResponse.json({
      available: true,
      recommendation: null,
      source: 'none',
      canGenerate: rateLimit.allowed && !cooldown.inCooldown,
      rateLimitRemaining: rateLimit.remaining,
      rateLimitResetAt: rateLimit.resetAt?.toISOString() || null,
      cooldownEndsAt: cooldown.cooldownEndsAt?.toISOString() || null,
    });
  } catch (error) {
    console.error('Failed to get AI recommendation:', error);
    return NextResponse.json(
      { error: 'Failed to get AI recommendation' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orgs/[slug]/domains/[domainId]/ai-recommendation
 * Generate a new AI recommendation (with rate limiting and cooldown)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const { slug, domainId } = await params;
    const result = await getDomainWithAccess(domainId, slug, session.user.id);

    if (!result) {
      return NextResponse.json(
        { error: 'Domain not found or insufficient permissions' },
        { status: 404 }
      );
    }

    const { domain, organization } = result;

    // Check if AI is configured and enabled
    const [integration] = await db
      .select({
        isEnabled: aiIntegrations.isEnabled,
        geminiApiKey: aiIntegrations.geminiApiKey,
      })
      .from(aiIntegrations)
      .where(eq(aiIntegrations.organizationId, organization.id));

    if (!integration?.geminiApiKey) {
      return NextResponse.json(
        { error: 'AI not configured' },
        { status: 400 }
      );
    }

    if (!integration.isEnabled) {
      return NextResponse.json(
        { error: 'AI is disabled' },
        { status: 400 }
      );
    }

    // Check cooldown
    const cooldown = await checkCooldown(domainId);
    if (cooldown.inCooldown) {
      return NextResponse.json(
        {
          error: 'Cooldown active',
          cooldownEndsAt: cooldown.cooldownEndsAt?.toISOString(),
        },
        { status: 429 }
      );
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(organization.id);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Daily limit reached',
          resetAt: rateLimit.resetAt?.toISOString(),
        },
        { status: 429 }
      );
    }

    // Build context
    const context = await buildContext(domain, organization.id);
    const contextHash = hashContext(context);

    // Note: We don't check cache here because POST is an explicit refresh request.
    // The GET endpoint handles caching. POST always generates fresh data.

    // Call Gemini
    try {
      const recommendation = await callGemini(
        integration.geminiApiKey,
        context
      );

      // Increment usage counter
      await incrementUsage(organization.id);

      // Cache the result
      await cacheRecommendation(domainId, recommendation, contextHash);

      // Clear any previous errors
      await clearError(organization.id);

      return NextResponse.json({
        recommendation: {
          ...recommendation,
          cached: false,
          generatedAt: new Date().toISOString(),
          expiresAt: new Date(
            Date.now() + 24 * 60 * 60 * 1000
          ).toISOString(),
        },
        source: 'generated',
      });
    } catch (apiError) {
      const errorMessage =
        apiError instanceof Error ? apiError.message : 'AI generation failed';
      await recordError(organization.id, errorMessage);
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  } catch (error) {
    console.error('Failed to generate AI recommendation:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI recommendation' },
      { status: 500 }
    );
  }
}
