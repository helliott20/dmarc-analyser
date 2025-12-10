/**
 * Forensic Reports (RUF) Type Definitions
 */

export type FeedbackType =
  | 'auth-failure'
  | 'fraud'
  | 'abuse'
  | 'not-spam'
  | 'virus'
  | 'other';

export type DkimResult =
  | 'none'
  | 'pass'
  | 'fail'
  | 'policy'
  | 'neutral'
  | 'temperror'
  | 'permerror';

export type SpfResult =
  | 'none'
  | 'pass'
  | 'fail'
  | 'softfail'
  | 'neutral'
  | 'temperror'
  | 'permerror';

/**
 * Authentication results stored in the authResults JSONB field
 */
export interface AuthenticationResults {
  dkim?: {
    result: DkimResult;
    domain?: string;
    selector?: string;
    humanResult?: string;
  };
  spf?: {
    result: SpfResult;
    domain?: string;
    scope?: string;
    humanResult?: string;
  };
  dmarc?: {
    result: 'pass' | 'fail';
    policy?: string;
  };
}

/**
 * Forensic Report - Database Model
 */
export interface ForensicReport {
  id: string;
  domainId: string;

  // Report metadata
  reportId: string | null;
  feedbackType: FeedbackType | null;
  reporterOrgName: string | null;
  userAgent: string | null;
  version: string | null;

  // Original mail info
  originalMailFrom: string | null;
  originalRcptTo: string | null;
  arrivalDate: Date | null;
  sourceIp: string | null;

  // Authentication results
  authResults: AuthenticationResults | null;
  deliveryResult: string | null;

  // DKIM/SPF results
  dkimDomain: string | null;
  dkimResult: DkimResult | null;
  spfDomain: string | null;
  spfResult: SpfResult | null;

  // Message details (may contain PII)
  subject: string | null;
  messageId: string | null;

  // Raw data
  rawReport: string | null;
  gmailMessageId: string | null;

  // Timestamps
  importedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Forensic Report List Item (API response)
 */
export interface ForensicReportListItem {
  id: string;
  reportId: string | null;
  feedbackType: FeedbackType | null;
  reporterOrgName: string | null;
  arrivalDate: string | null;
  sourceIp: string | null;
  originalMailFrom: string | null;
  originalRcptTo: string | null;
  subject: string | null;
  messageId: string | null;
  authResults: AuthenticationResults | null;
  dkimResult: DkimResult | null;
  spfResult: SpfResult | null;
  dkimDomain: string | null;
  spfDomain: string | null;
  createdAt: string;
}

/**
 * Forensic Report Detail (full report)
 */
export interface ForensicReportDetail extends ForensicReportListItem {
  deliveryResult: string | null;
  userAgent: string | null;
  version: string | null;
  rawReport: string | null;
  gmailMessageId: string | null;
  importedAt: string;
  updatedAt: string;
}

/**
 * Forensic Reports API Response
 */
export interface ForensicReportsResponse {
  reports: ForensicReportListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: Record<FeedbackType, number>;
}

/**
 * Forensic Reports Statistics
 */
export interface ForensicReportStats {
  total: number;
  byType: Record<FeedbackType, number>;
  spfFailures: number;
  dkimFailures: number;
  authFailures: number;
  lastReportDate?: Date;
}

/**
 * Forensic Report Filter Options
 */
export interface ForensicReportFilters {
  feedbackType?: FeedbackType | 'all';
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

/**
 * Helper to check if authentication passed
 */
export function isAuthenticationPassing(
  dkimResult: DkimResult | null,
  spfResult: SpfResult | null
): boolean {
  return dkimResult === 'pass' || spfResult === 'pass';
}

/**
 * Helper to get human-readable feedback type
 */
export function getFeedbackTypeLabel(type: FeedbackType | null): string {
  if (!type) return 'Unknown';

  const labels: Record<FeedbackType, string> = {
    'auth-failure': 'Authentication Failure',
    'fraud': 'Fraud/Phishing',
    'abuse': 'Abuse',
    'not-spam': 'Not Spam',
    'virus': 'Virus/Malware',
    'other': 'Other',
  };

  return labels[type] || type;
}

/**
 * Helper to get severity level from feedback type
 */
export function getFeedbackTypeSeverity(
  type: FeedbackType | null
): 'critical' | 'warning' | 'info' {
  if (!type) return 'info';

  const critical: FeedbackType[] = ['fraud', 'virus'];
  const warning: FeedbackType[] = ['auth-failure', 'abuse'];

  if (critical.includes(type)) return 'critical';
  if (warning.includes(type)) return 'warning';
  return 'info';
}

/**
 * Helper to format authentication result
 */
export function formatAuthResult(result: DkimResult | SpfResult | null): string {
  if (!result) return 'Unknown';
  return result.charAt(0).toUpperCase() + result.slice(1);
}
