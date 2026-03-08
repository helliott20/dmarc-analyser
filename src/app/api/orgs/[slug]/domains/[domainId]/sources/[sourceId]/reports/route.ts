import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, domains, sources, reports, records, knownSenders, dkimResults, spfResults } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ slug: string; domainId: string; sourceId: string }>;
}

async function getSourceWithAccess(
  sourceId: string,
  domainId: string,
  orgSlug: string,
  userId: string
) {
  const [result] = await db
    .select({
      source: sources,
      domain: domains,
      organization: organizations,
      role: orgMembers.role,
      knownSender: knownSenders,
    })
    .from(sources)
    .innerJoin(domains, eq(sources.domainId, domains.id))
    .innerJoin(organizations, eq(domains.organizationId, organizations.id))
    .innerJoin(orgMembers, eq(organizations.id, orgMembers.organizationId))
    .leftJoin(knownSenders, eq(sources.knownSenderId, knownSenders.id))
    .where(
      and(
        eq(sources.id, sourceId),
        eq(sources.domainId, domainId),
        eq(organizations.slug, orgSlug),
        eq(orgMembers.userId, userId)
      )
    );

  return result;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug, domainId, sourceId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getSourceWithAccess(sourceId, domainId, slug, session.user.id);

    if (!result) {
      return NextResponse.json(
        { error: 'Source not found or insufficient permissions' },
        { status: 404 }
      );
    }

    const { source, knownSender } = result;

    // Get all reports that contain records from this source IP
    // We need to find records with matching sourceIp, then get their reports
    const reportsWithSource = await db
      .select({
        report: reports,
        recordCount: sql<number>`count(${records.id})::int`,
        totalMessages: sql<number>`sum(${records.count})::int`,
        passedMessages: sql<number>`sum(case when ${records.dmarcDkim} = 'pass' or ${records.dmarcSpf} = 'pass' then ${records.count} else 0 end)::int`,
        failedMessages: sql<number>`sum(case when ${records.dmarcDkim} != 'pass' and ${records.dmarcSpf} != 'pass' then ${records.count} else 0 end)::int`,
      })
      .from(records)
      .innerJoin(reports, eq(records.reportId, reports.id))
      .where(
        and(
          eq(reports.domainId, domainId),
          eq(records.sourceIp, source.sourceIp)
        )
      )
      .groupBy(reports.id)
      .orderBy(desc(reports.dateRangeBegin))
      .limit(50);

    // Format the response
    const formattedReports = reportsWithSource.map(({ report, recordCount, totalMessages, passedMessages, failedMessages }) => ({
      id: report.id,
      reportId: report.reportId,
      orgName: report.orgName,
      email: report.email,
      dateRangeBegin: report.dateRangeBegin,
      dateRangeEnd: report.dateRangeEnd,
      policyDomain: report.policyDomain,
      recordCount,
      totalMessages: totalMessages || 0,
      passedMessages: passedMessages || 0,
      failedMessages: failedMessages || 0,
      passRate: totalMessages > 0 ? Math.round((passedMessages / totalMessages) * 100) : 0,
    }));

    // Get auth failure details for this source IP across all records
    const authDetails = await db
      .select({
        recordId: records.id,
        dmarcDkim: records.dmarcDkim,
        dmarcSpf: records.dmarcSpf,
        disposition: records.disposition,
        count: records.count,
        headerFrom: records.headerFrom,
        envelopeFrom: records.envelopeFrom,
        policyOverrideReason: records.policyOverrideReason,
      })
      .from(records)
      .innerJoin(reports, eq(records.reportId, reports.id))
      .where(
        and(
          eq(reports.domainId, domainId),
          eq(records.sourceIp, source.sourceIp)
        )
      )
      .orderBy(desc(reports.dateRangeBegin))
      .limit(100);

    // Get DKIM and SPF result details for these records
    const recordIds = authDetails.map(r => r.recordId);
    let dkimDetails: { recordId: string; domain: string; selector: string | null; result: string }[] = [];
    let spfDetails: { recordId: string; domain: string; scope: string | null; result: string }[] = [];

    if (recordIds.length > 0) {
      [dkimDetails, spfDetails] = await Promise.all([
        db
          .select({
            recordId: dkimResults.recordId,
            domain: dkimResults.domain,
            selector: dkimResults.selector,
            result: dkimResults.result,
          })
          .from(dkimResults)
          .where(sql`${dkimResults.recordId} IN ${recordIds}`),
        db
          .select({
            recordId: spfResults.recordId,
            domain: spfResults.domain,
            scope: spfResults.scope,
            result: spfResults.result,
          })
          .from(spfResults)
          .where(sql`${spfResults.recordId} IN ${recordIds}`),
      ]);
    }

    // Aggregate auth failure analysis
    const dkimFailCount = dkimDetails.filter(d => d.result !== 'pass').length;
    const spfFailCount = spfDetails.filter(s => s.result !== 'pass').length;
    const dkimPassCount = dkimDetails.filter(d => d.result === 'pass').length;
    const spfPassCount = spfDetails.filter(s => s.result === 'pass').length;

    // Group DKIM failures by domain
    const dkimFailuresByDomain: Record<string, { count: number; results: string[]; selectors: string[] }> = {};
    dkimDetails.filter(d => d.result !== 'pass').forEach(d => {
      if (!dkimFailuresByDomain[d.domain]) {
        dkimFailuresByDomain[d.domain] = { count: 0, results: [], selectors: [] };
      }
      dkimFailuresByDomain[d.domain].count++;
      if (!dkimFailuresByDomain[d.domain].results.includes(d.result)) {
        dkimFailuresByDomain[d.domain].results.push(d.result);
      }
      if (d.selector && !dkimFailuresByDomain[d.domain].selectors.includes(d.selector)) {
        dkimFailuresByDomain[d.domain].selectors.push(d.selector);
      }
    });

    // Group SPF failures by domain
    const spfFailuresByDomain: Record<string, { count: number; results: string[] }> = {};
    spfDetails.filter(s => s.result !== 'pass').forEach(s => {
      if (!spfFailuresByDomain[s.domain]) {
        spfFailuresByDomain[s.domain] = { count: 0, results: [] };
      }
      spfFailuresByDomain[s.domain].count++;
      if (!spfFailuresByDomain[s.domain].results.includes(s.result)) {
        spfFailuresByDomain[s.domain].results.push(s.result);
      }
    });

    // Count dispositions
    const dispositions = authDetails.reduce((acc, r) => {
      acc[r.disposition] = (acc[r.disposition] || 0) + r.count;
      return acc;
    }, {} as Record<string, number>);

    // Collect policy override reasons
    const overrideReasons = authDetails
      .filter(r => r.policyOverrideReason)
      .map(r => r.policyOverrideReason)
      .flat()
      .filter(Boolean);

    return NextResponse.json({
      source: {
        id: source.id,
        sourceIp: source.sourceIp,
        hostname: source.hostname,
        organization: source.organization,
        country: source.country,
        city: source.city,
        asn: source.asn,
        sourceType: source.sourceType,
        totalMessages: source.totalMessages,
        passedMessages: source.passedMessages,
        failedMessages: source.failedMessages,
        firstSeen: source.firstSeen,
        lastSeen: source.lastSeen,
      },
      knownSender: knownSender ? {
        id: knownSender.id,
        name: knownSender.name,
        logoUrl: knownSender.logoUrl,
        category: knownSender.category,
        website: knownSender.website,
        isGlobal: knownSender.isGlobal,
      } : null,
      reports: formattedReports,
      failureAnalysis: {
        dkim: {
          total: dkimDetails.length,
          passed: dkimPassCount,
          failed: dkimFailCount,
          failuresByDomain: dkimFailuresByDomain,
        },
        spf: {
          total: spfDetails.length,
          passed: spfPassCount,
          failed: spfFailCount,
          failuresByDomain: spfFailuresByDomain,
        },
        dispositions,
        overrideReasons,
      },
    });
  } catch (error) {
    console.error('Failed to get source reports:', error);
    return NextResponse.json(
      { error: 'Failed to get source reports' },
      { status: 500 }
    );
  }
}
