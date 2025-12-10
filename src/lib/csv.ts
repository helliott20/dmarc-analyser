/**
 * CSV Export Utilities for DMARC Analyser
 */

export interface ReportExportRow {
  reportId: string;
  orgName: string;
  domain: string;
  dateRangeStart: Date;
  dateRangeEnd: Date;
  sourceIp: string;
  sourceCount: number;
  spfResult: string;
  dkimResult: string;
  dmarcDisposition: string;
  policyOverride: string;
}

export interface SourceExportRow {
  sourceIp: string;
  hostname: string | null;
  country: string | null;
  city: string | null;
  asn: string | null;
  organization: string | null;
  totalMessages: number;
  passCount: number;
  failCount: number;
  firstSeen: Date | null;
  lastSeen: Date | null;
  classification: string;
}

export interface TimelineExportRow {
  date: string;
  totalMessages: number;
  passed: number;
  failed: number;
  passRate: number;
  uniqueSources: number;
}

/**
 * Escapes CSV field values to prevent injection and handle special characters
 */
function escapeCSVField(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // If the value contains comma, quotes, or newlines, wrap it in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Converts an array of objects to CSV string
 */
function arrayToCSV<T extends Record<string, any>>(
  data: T[],
  headers: { key: keyof T; label: string }[]
): string {
  // Build header row
  const headerRow = headers.map(h => escapeCSVField(h.label)).join(',');

  // Build data rows
  const dataRows = data.map(row => {
    return headers.map(h => {
      const value = row[h.key] as unknown;

      // Format dates
      if (value instanceof Date) {
        return escapeCSVField(value.toISOString());
      }

      // Format numbers
      if (typeof value === 'number') {
        return escapeCSVField(value);
      }

      return escapeCSVField(value);
    }).join(',');
  });

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Generates CSV for reports export
 */
export function generateReportsCSV(data: ReportExportRow[]): string {
  const headers = [
    { key: 'reportId' as const, label: 'Report ID' },
    { key: 'orgName' as const, label: 'Org Name' },
    { key: 'domain' as const, label: 'Domain' },
    { key: 'dateRangeStart' as const, label: 'Date Range Start' },
    { key: 'dateRangeEnd' as const, label: 'Date Range End' },
    { key: 'sourceIp' as const, label: 'Source IP' },
    { key: 'sourceCount' as const, label: 'Source Count' },
    { key: 'spfResult' as const, label: 'SPF Result' },
    { key: 'dkimResult' as const, label: 'DKIM Result' },
    { key: 'dmarcDisposition' as const, label: 'DMARC Disposition' },
    { key: 'policyOverride' as const, label: 'Policy Override' },
  ];

  return arrayToCSV(data, headers);
}

/**
 * Generates CSV for sources export
 */
export function generateSourcesCSV(data: SourceExportRow[]): string {
  const headers = [
    { key: 'sourceIp' as const, label: 'Source IP' },
    { key: 'hostname' as const, label: 'Hostname' },
    { key: 'country' as const, label: 'Country' },
    { key: 'city' as const, label: 'City' },
    { key: 'asn' as const, label: 'ASN' },
    { key: 'organization' as const, label: 'Org Name' },
    { key: 'totalMessages' as const, label: 'Total Messages' },
    { key: 'passCount' as const, label: 'Pass Count' },
    { key: 'failCount' as const, label: 'Fail Count' },
    { key: 'firstSeen' as const, label: 'First Seen' },
    { key: 'lastSeen' as const, label: 'Last Seen' },
    { key: 'classification' as const, label: 'Classification' },
  ];

  return arrayToCSV(data, headers);
}

/**
 * Generates CSV for timeline export
 */
export function generateTimelineCSV(data: TimelineExportRow[]): string {
  const headers = [
    { key: 'date' as const, label: 'Date' },
    { key: 'totalMessages' as const, label: 'Total Messages' },
    { key: 'passed' as const, label: 'Passed' },
    { key: 'failed' as const, label: 'Failed' },
    { key: 'passRate' as const, label: 'Pass Rate' },
    { key: 'uniqueSources' as const, label: 'Unique Sources' },
  ];

  return arrayToCSV(data, headers);
}

/**
 * Creates a CSV download response with proper headers
 */
export function createCSVResponse(csvContent: string, filename: string): Response {
  return new Response(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
