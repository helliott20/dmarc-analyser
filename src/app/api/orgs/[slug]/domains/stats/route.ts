import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import {
  organizations,
  orgMembers,
  domains,
  reports,
  records,
  sources,
  domainTags,
  domainTagAssignments,
} from '@/db/schema';
import { eq, and, gte, inArray, sql, desc, count, sum } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

async function getOrgAndCheckAccess(slug: string, userId: string) {
  const [membership] = await db
    .select({
      organization: organizations,
      role: orgMembers.role,
    })
    .from(organizations)
    .innerJoin(orgMembers, eq(organizations.id, orgMembers.organizationId))
    .where(and(eq(organizations.slug, slug), eq(orgMembers.userId, userId)));

  return membership;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const membership = await getOrgAndCheckAccess(slug, session.user.id);

    if (!membership) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const { organization } = membership;

    // Get time ranges
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get all domains for this org
    const orgDomains = await db
      .select()
      .from(domains)
      .where(eq(domains.organizationId, organization.id))
      .orderBy(domains.domain);

    if (orgDomains.length === 0) {
      return NextResponse.json({
        domains: [],
        summary: {
          activeDomains: 0,
          inactiveDomains: 0,
          totalMessages7d: 0,
          dmarcCapablePercent: 0,
          forwardedPercent: 0,
          threatPercent: 0,
        },
        topSources: [],
        threatsByCountry: [],
      });
    }

    const domainIds = orgDomains.map((d) => d.id);

    // Get reports for these domains in the last 7 days
    const recentReports = await db
      .select({
        id: reports.id,
        domainId: reports.domainId,
        dateRangeBegin: reports.dateRangeBegin,
      })
      .from(reports)
      .where(
        and(
          inArray(reports.domainId, domainIds),
          gte(reports.dateRangeBegin, sevenDaysAgo)
        )
      );

    // Get all records for these reports
    let domainStats: Map<string, { totalMessages: number; passedMessages: number; failedMessages: number }> = new Map();
    let totalMessages7d = 0;
    let passedMessages7d = 0;
    let failedMessages7d = 0;

    if (recentReports.length > 0) {
      const reportIds = recentReports.map((r) => r.id);
      const reportDomainMap = new Map(recentReports.map((r) => [r.id, r.domainId]));

      const recordsData = await db
        .select({
          reportId: records.reportId,
          count: records.count,
          dmarcDkim: records.dmarcDkim,
          dmarcSpf: records.dmarcSpf,
        })
        .from(records)
        .where(inArray(records.reportId, reportIds));

      for (const record of recordsData) {
        const domainId = reportDomainMap.get(record.reportId);
        if (!domainId) continue;

        const isPassing = record.dmarcDkim === 'pass' || record.dmarcSpf === 'pass';

        // Initialize domain stats if not exists
        if (!domainStats.has(domainId)) {
          domainStats.set(domainId, { totalMessages: 0, passedMessages: 0, failedMessages: 0 });
        }

        const stats = domainStats.get(domainId)!;
        stats.totalMessages += record.count;
        if (isPassing) {
          stats.passedMessages += record.count;
        } else {
          stats.failedMessages += record.count;
        }

        // Update totals
        totalMessages7d += record.count;
        if (isPassing) {
          passedMessages7d += record.count;
        } else {
          failedMessages7d += record.count;
        }
      }
    }

    // Get sources data for the last 7 days
    const sourcesData = await db
      .select({
        id: sources.id,
        domainId: sources.domainId,
        sourceIp: sources.sourceIp,
        organization: sources.organization,
        country: sources.country,
        sourceType: sources.sourceType,
        totalMessages: sources.totalMessages,
        passedMessages: sources.passedMessages,
        failedMessages: sources.failedMessages,
        lastSeen: sources.lastSeen,
      })
      .from(sources)
      .where(
        and(
          inArray(sources.domainId, domainIds),
          gte(sources.lastSeen, sevenDaysAgo)
        )
      )
      .orderBy(desc(sources.totalMessages));

    // Calculate source type stats
    let legitimateMessages = 0;
    let forwardedMessages = 0;
    let threatMessages = 0;
    let unknownMessages = 0;

    const countryThreats: Map<string, number> = new Map();

    for (const source of sourcesData) {
      const messages = Number(source.totalMessages);

      switch (source.sourceType) {
        case 'legitimate':
          legitimateMessages += messages;
          break;
        case 'forwarded':
          forwardedMessages += messages;
          break;
        case 'suspicious':
          threatMessages += messages;
          if (source.country) {
            countryThreats.set(source.country, (countryThreats.get(source.country) || 0) + messages);
          }
          break;
        default:
          unknownMessages += messages;
          // Count unknown as potential threats by country too
          if (source.country) {
            countryThreats.set(source.country, (countryThreats.get(source.country) || 0) + messages);
          }
          break;
      }
    }

    // Calculate top sources (aggregate by organization)
    const sourcesByOrg: Map<string, {
      organization: string;
      totalMessages: number;
      passedMessages: number;
      spfPass: number;
      dkimPass: number;
    }> = new Map();

    // Get detailed SPF/DKIM stats from records
    if (recentReports.length > 0) {
      const reportIds = recentReports.map((r) => r.id);

      const detailedRecords = await db
        .select({
          reportId: records.reportId,
          sourceIp: records.sourceIp,
          count: records.count,
          dmarcDkim: records.dmarcDkim,
          dmarcSpf: records.dmarcSpf,
        })
        .from(records)
        .where(inArray(records.reportId, reportIds));

      // Map source IPs to organizations
      const ipToOrg: Map<string, string> = new Map();
      for (const source of sourcesData) {
        if (source.organization) {
          ipToOrg.set(source.sourceIp, source.organization);
        }
      }

      for (const record of detailedRecords) {
        const org = ipToOrg.get(record.sourceIp) || 'Unknown';

        if (!sourcesByOrg.has(org)) {
          sourcesByOrg.set(org, {
            organization: org,
            totalMessages: 0,
            passedMessages: 0,
            spfPass: 0,
            dkimPass: 0,
          });
        }

        const stats = sourcesByOrg.get(org)!;
        stats.totalMessages += record.count;

        if (record.dmarcDkim === 'pass' || record.dmarcSpf === 'pass') {
          stats.passedMessages += record.count;
        }
        if (record.dmarcSpf === 'pass') {
          stats.spfPass += record.count;
        }
        if (record.dmarcDkim === 'pass') {
          stats.dkimPass += record.count;
        }
      }
    }

    // Sort and get top 10 sources
    const topSources = Array.from(sourcesByOrg.values())
      .sort((a, b) => b.totalMessages - a.totalMessages)
      .slice(0, 10)
      .map((s) => ({
        organization: s.organization,
        totalMessages: s.totalMessages,
        dmarcPercent: s.totalMessages > 0 ? Math.round((s.passedMessages / s.totalMessages) * 100) : 0,
        spfPercent: s.totalMessages > 0 ? Math.round((s.spfPass / s.totalMessages) * 100) : 0,
        dkimPercent: s.totalMessages > 0 ? Math.round((s.dkimPass / s.totalMessages) * 100) : 0,
      }));

    // Get threats by country (top 10)
    const threatsByCountry = Array.from(countryThreats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([country, messages]) => ({
        country,
        messages,
      }));

    // Calculate max volume for relative sizing
    const maxVolume = Math.max(...Array.from(domainStats.values()).map((s) => s.totalMessages), 1);

    // Get tags for all domains
    const tagAssignments = await db
      .select({
        domainId: domainTagAssignments.domainId,
        tagId: domainTags.id,
        tagName: domainTags.name,
        tagColor: domainTags.color,
      })
      .from(domainTagAssignments)
      .innerJoin(domainTags, eq(domainTagAssignments.tagId, domainTags.id))
      .where(inArray(domainTagAssignments.domainId, domainIds));

    // Group tags by domain
    const tagsByDomain = new Map<string, Array<{ id: string; name: string; color: string }>>();
    for (const assignment of tagAssignments) {
      const tags = tagsByDomain.get(assignment.domainId) || [];
      tags.push({ id: assignment.tagId, name: assignment.tagName, color: assignment.tagColor });
      tagsByDomain.set(assignment.domainId, tags);
    }

    // Build domain response with volume data
    const domainsWithStats = orgDomains.map((domain) => {
      const stats = domainStats.get(domain.id) || { totalMessages: 0, passedMessages: 0, failedMessages: 0 };
      const hasActivity = stats.totalMessages > 0;
      const tags = tagsByDomain.get(domain.id) || [];

      return {
        id: domain.id,
        domain: domain.domain,
        displayName: domain.displayName,
        verifiedAt: domain.verifiedAt,
        isActive: hasActivity,
        totalMessages: stats.totalMessages,
        passedMessages: stats.passedMessages,
        failedMessages: stats.failedMessages,
        passRate: stats.totalMessages > 0 ? Math.round((stats.passedMessages / stats.totalMessages) * 100) : 0,
        volumePercent: Math.round((stats.totalMessages / maxVolume) * 100),
        tags,
      };
    });

    // Sort domains by volume (most active first)
    domainsWithStats.sort((a, b) => b.totalMessages - a.totalMessages);

    // Calculate summary stats
    const activeDomains = domainsWithStats.filter((d) => d.isActive).length;
    const inactiveDomains = domainsWithStats.filter((d) => !d.isActive).length;

    const totalSourceMessages = legitimateMessages + forwardedMessages + threatMessages + unknownMessages;
    const dmarcCapablePercent = totalSourceMessages > 0
      ? Math.round((legitimateMessages / totalSourceMessages) * 100)
      : 0;
    const forwardedPercent = totalSourceMessages > 0
      ? Math.round((forwardedMessages / totalSourceMessages) * 100)
      : 0;
    const threatPercent = totalSourceMessages > 0
      ? Math.round(((threatMessages + unknownMessages) / totalSourceMessages) * 100)
      : 0;

    return NextResponse.json({
      domains: domainsWithStats,
      summary: {
        activeDomains,
        inactiveDomains,
        totalMessages7d,
        passedMessages7d,
        failedMessages7d,
        passRate7d: totalMessages7d > 0 ? Math.round((passedMessages7d / totalMessages7d) * 100) : 0,
        dmarcCapablePercent,
        forwardedPercent,
        threatPercent,
      },
      topSources,
      threatsByCountry,
    });
  } catch (error) {
    console.error('Failed to get domain stats:', error);
    return NextResponse.json(
      { error: 'Failed to get domain stats' },
      { status: 500 }
    );
  }
}
