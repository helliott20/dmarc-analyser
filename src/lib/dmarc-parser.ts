import { XMLParser } from 'fast-xml-parser';

export interface DmarcReportMetadata {
  orgName: string;
  email: string;
  extraContactInfo?: string;
  reportId: string;
  dateRangeBegin: Date;
  dateRangeEnd: Date;
}

export interface DmarcPolicy {
  domain: string;
  adkim?: 'r' | 's';
  aspf?: 'r' | 's';
  p?: 'none' | 'quarantine' | 'reject';
  sp?: 'none' | 'quarantine' | 'reject';
  pct?: number;
}

export interface DkimAuthResult {
  domain: string;
  selector?: string;
  result: 'none' | 'pass' | 'fail' | 'policy' | 'neutral' | 'temperror' | 'permerror';
  humanResult?: string;
}

export interface SpfAuthResult {
  domain: string;
  scope?: string;
  result: 'none' | 'pass' | 'fail' | 'softfail' | 'neutral' | 'temperror' | 'permerror';
}

export interface DmarcRecord {
  sourceIp: string;
  count: number;
  disposition: 'none' | 'quarantine' | 'reject';
  dmarcDkim?: 'pass' | 'fail';
  dmarcSpf?: 'pass' | 'fail';
  policyOverrideReason?: {
    type: string;
    comment?: string;
  }[];
  headerFrom?: string;
  envelopeFrom?: string;
  envelopeTo?: string;
  dkimResults: DkimAuthResult[];
  spfResults: SpfAuthResult[];
}

export interface ParsedDmarcReport {
  metadata: DmarcReportMetadata;
  policy: DmarcPolicy;
  records: DmarcRecord[];
  rawXml: string;
}

function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function parseAlignment(value: string | undefined): 'r' | 's' | undefined {
  if (value === 'r' || value === 's') return value;
  return undefined;
}

function parsePolicy(value: string | undefined): 'none' | 'quarantine' | 'reject' | undefined {
  if (value === 'none' || value === 'quarantine' || value === 'reject') return value;
  return undefined;
}

function parseDisposition(value: string | undefined): 'none' | 'quarantine' | 'reject' {
  if (value === 'quarantine' || value === 'reject') return value;
  return 'none';
}

function parseDmarcResult(value: string | undefined): 'pass' | 'fail' | undefined {
  if (value === 'pass' || value === 'fail') return value;
  return undefined;
}

function parseDkimResult(value: string | undefined): DkimAuthResult['result'] {
  const validResults = ['none', 'pass', 'fail', 'policy', 'neutral', 'temperror', 'permerror'];
  if (validResults.includes(value || '')) return value as DkimAuthResult['result'];
  return 'none';
}

function parseSpfResult(value: string | undefined): SpfAuthResult['result'] {
  const validResults = ['none', 'pass', 'fail', 'softfail', 'neutral', 'temperror', 'permerror'];
  if (validResults.includes(value || '')) return value as SpfAuthResult['result'];
  return 'none';
}

export function parseDmarcReport(xml: string): ParsedDmarcReport {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseAttributeValue: false,
    parseTagValue: true,
    trimValues: true,
  });

  const result = parser.parse(xml);
  const feedback = result.feedback;

  if (!feedback) {
    throw new Error('Invalid DMARC report: missing feedback element');
  }

  // Parse report metadata
  const reportMetadata = feedback.report_metadata;
  if (!reportMetadata) {
    throw new Error('Invalid DMARC report: missing report_metadata');
  }

  const dateRange = reportMetadata.date_range;
  if (!dateRange) {
    throw new Error('Invalid DMARC report: missing date_range');
  }

  const metadata: DmarcReportMetadata = {
    orgName: reportMetadata.org_name || 'Unknown',
    email: reportMetadata.email || '',
    extraContactInfo: reportMetadata.extra_contact_info,
    reportId: reportMetadata.report_id || `unknown-${Date.now()}`,
    dateRangeBegin: new Date(parseInt(dateRange.begin) * 1000),
    dateRangeEnd: new Date(parseInt(dateRange.end) * 1000),
  };

  // Parse policy
  const policyPublished = feedback.policy_published;
  if (!policyPublished) {
    throw new Error('Invalid DMARC report: missing policy_published');
  }

  const policy: DmarcPolicy = {
    domain: policyPublished.domain || '',
    adkim: parseAlignment(policyPublished.adkim),
    aspf: parseAlignment(policyPublished.aspf),
    p: parsePolicy(policyPublished.p),
    sp: parsePolicy(policyPublished.sp),
    pct: policyPublished.pct ? parseInt(policyPublished.pct) : undefined,
  };

  // Parse records
  const recordsData = ensureArray(feedback.record);
  const records: DmarcRecord[] = [];

  for (const recordData of recordsData) {
    const row = recordData.row;
    if (!row) continue;

    const policyEvaluated = row.policy_evaluated || {};
    const identifiers = recordData.identifiers || {};
    const authResults = recordData.auth_results || {};

    // Parse policy override reasons
    const overrideReasons = ensureArray(policyEvaluated.reason).map((r: Record<string, string>) => ({
      type: r.type || 'unknown',
      comment: r.comment,
    }));

    // Parse DKIM results
    const dkimResults: DkimAuthResult[] = ensureArray(authResults.dkim).map((d: Record<string, string>) => ({
      domain: d.domain || '',
      selector: d.selector,
      result: parseDkimResult(d.result),
      humanResult: d.human_result,
    }));

    // Parse SPF results
    const spfResults: SpfAuthResult[] = ensureArray(authResults.spf).map((s: Record<string, string>) => ({
      domain: s.domain || '',
      scope: s.scope,
      result: parseSpfResult(s.result),
    }));

    records.push({
      sourceIp: row.source_ip || '',
      count: parseInt(row.count) || 0,
      disposition: parseDisposition(policyEvaluated.disposition),
      dmarcDkim: parseDmarcResult(policyEvaluated.dkim),
      dmarcSpf: parseDmarcResult(policyEvaluated.spf),
      policyOverrideReason: overrideReasons.length > 0 ? overrideReasons : undefined,
      headerFrom: identifiers.header_from,
      envelopeFrom: identifiers.envelope_from,
      envelopeTo: identifiers.envelope_to,
      dkimResults,
      spfResults,
    });
  }

  return {
    metadata,
    policy,
    records,
    rawXml: xml,
  };
}

export function validateDmarcReport(xml: string): { valid: boolean; error?: string } {
  try {
    parseDmarcReport(xml);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
