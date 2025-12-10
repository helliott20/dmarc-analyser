import { db } from '@/db';
import {
  reports,
  records,
  dkimResults,
  spfResults,
  sources,
  domains,
  subdomains,
} from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { parseDmarcReport } from './dmarc-parser';

interface ImportResult {
  success: boolean;
  reportId?: string;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

// Note: IP geo data can be filled in later via a background job

/**
 * Check if headerFrom is a subdomain of the tracked domain
 * Returns the subdomain if it is, otherwise null
 */
function extractSubdomain(headerFrom: string | undefined | null, domain: string): string | null {
  if (!headerFrom) return null;

  const headerFromLower = headerFrom.toLowerCase().trim();
  const domainLower = domain.toLowerCase().trim();

  // Check if headerFrom ends with .domain (subdomain)
  if (headerFromLower.endsWith('.' + domainLower) && headerFromLower !== domainLower) {
    return headerFromLower;
  }

  return null;
}

export async function importDmarcReport(
  xml: string,
  domainId: string,
  gmailMessageId?: string
): Promise<ImportResult> {
  try {
    const parsed = parseDmarcReport(xml);

    // Check if report already exists (by report_id and org_name)
    const existing = await db
      .select()
      .from(reports)
      .where(
        and(
          eq(reports.reportId, parsed.metadata.reportId),
          eq(reports.orgName, parsed.metadata.orgName)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return {
        success: true,
        skipped: true,
        skipReason: 'Report already imported',
        reportId: existing[0].id,
      };
    }

    // Get domain info
    const [domain] = await db
      .select()
      .from(domains)
      .where(eq(domains.id, domainId));

    if (!domain) {
      return {
        success: false,
        error: 'Domain not found',
      };
    }

    // Verify the report is for the correct domain
    if (parsed.policy.domain.toLowerCase() !== domain.domain.toLowerCase()) {
      return {
        success: false,
        error: `Report domain mismatch: expected ${domain.domain}, got ${parsed.policy.domain}`,
      };
    }

    // Create the report
    const [newReport] = await db
      .insert(reports)
      .values({
        domainId,
        reportId: parsed.metadata.reportId,
        orgName: parsed.metadata.orgName,
        email: parsed.metadata.email,
        extraContactInfo: parsed.metadata.extraContactInfo,
        dateRangeBegin: parsed.metadata.dateRangeBegin,
        dateRangeEnd: parsed.metadata.dateRangeEnd,
        policyDomain: parsed.policy.domain,
        policyAdkim: parsed.policy.adkim,
        policyAspf: parsed.policy.aspf,
        policyP: parsed.policy.p,
        policySp: parsed.policy.sp,
        policyPct: parsed.policy.pct,
        rawXml: parsed.rawXml,
        gmailMessageId,
      })
      .returning();

    // Import records
    for (const record of parsed.records) {
      // Create the record
      const [newRecord] = await db
        .insert(records)
        .values({
          reportId: newReport.id,
          sourceIp: record.sourceIp,
          count: record.count,
          disposition: record.disposition,
          dmarcDkim: record.dmarcDkim,
          dmarcSpf: record.dmarcSpf,
          policyOverrideReason: record.policyOverrideReason,
          headerFrom: record.headerFrom,
          envelopeFrom: record.envelopeFrom,
          envelopeTo: record.envelopeTo,
        })
        .returning();

      // Create DKIM results
      for (const dkim of record.dkimResults) {
        await db.insert(dkimResults).values({
          recordId: newRecord.id,
          domain: dkim.domain,
          selector: dkim.selector,
          result: dkim.result,
          humanResult: dkim.humanResult,
        });
      }

      // Create SPF results
      for (const spf of record.spfResults) {
        await db.insert(spfResults).values({
          recordId: newRecord.id,
          domain: spf.domain,
          scope: spf.scope,
          result: spf.result,
        });
      }

      // Upsert source (use ON CONFLICT to handle race conditions in parallel processing)
      const isPassing = record.dmarcDkim === 'pass' || record.dmarcSpf === 'pass';

      await db
        .insert(sources)
        .values({
          domainId,
          sourceIp: record.sourceIp,
          totalMessages: record.count,
          passedMessages: isPassing ? record.count : 0,
          failedMessages: !isPassing ? record.count : 0,
          firstSeen: parsed.metadata.dateRangeBegin,
          lastSeen: parsed.metadata.dateRangeEnd,
        })
        .onConflictDoUpdate({
          target: [sources.domainId, sources.sourceIp],
          set: {
            totalMessages: sql`${sources.totalMessages} + ${record.count}`,
            passedMessages: isPassing
              ? sql`${sources.passedMessages} + ${record.count}`
              : sources.passedMessages,
            failedMessages: !isPassing
              ? sql`${sources.failedMessages} + ${record.count}`
              : sources.failedMessages,
            lastSeen: parsed.metadata.dateRangeEnd,
            updatedAt: new Date(),
          },
        });

      // Track subdomain if headerFrom is a subdomain of the tracked domain
      const subdomainName = extractSubdomain(record.headerFrom, domain.domain);
      if (subdomainName) {
        await db
          .insert(subdomains)
          .values({
            domainId,
            subdomain: subdomainName,
            messageCount: record.count,
            passCount: isPassing ? record.count : 0,
            failCount: !isPassing ? record.count : 0,
            firstSeen: parsed.metadata.dateRangeBegin,
            lastSeen: parsed.metadata.dateRangeEnd,
          })
          .onConflictDoUpdate({
            target: [subdomains.domainId, subdomains.subdomain],
            set: {
              messageCount: sql`${subdomains.messageCount} + ${record.count}`,
              passCount: isPassing
                ? sql`${subdomains.passCount} + ${record.count}`
                : subdomains.passCount,
              failCount: !isPassing
                ? sql`${subdomains.failCount} + ${record.count}`
                : subdomains.failCount,
              lastSeen: parsed.metadata.dateRangeEnd,
              updatedAt: new Date(),
            },
          });
      }
    }

    return {
      success: true,
      reportId: newReport.id,
    };
  } catch (error) {
    console.error('Failed to import DMARC report:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function importDmarcReportFromXml(
  xml: string,
  domainId: string,
  gmailMessageId?: string
): Promise<ImportResult> {
  return importDmarcReport(xml, domainId, gmailMessageId);
}
