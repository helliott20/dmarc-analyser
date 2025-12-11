// Job data types for each queue

export interface GmailSyncJobData {
  gmailAccountId: string;
  organizationId: string;
  fullSync?: boolean; // If true, sync all emails, not just recent
}

export interface ReportParserJobData {
  organizationId: string;
  domainId: string;
  emailId: string; // Gmail message ID
  attachmentData: string; // Base64 encoded attachment
  filename: string;
}

export interface SourceAggregatorJobData {
  domainId: string;
}

export interface AlertsJobData {
  type: 'report_imported' | 'dns_change' | 'scheduled_check';
  domainId?: string;
  reportId?: string;
  organizationId: string;
}

export interface DnsCheckJobData {
  domainId: string;
  organizationId: string;
}

export interface WebhookDeliveryJobData {
  webhookId: string;
  event: string;
  payload: Record<string, unknown>;
  attempt?: number;
}

export interface ScheduledReportJobData {
  scheduledReportId: string;
  organizationId: string;
}

export interface IpEnrichmentJobData {
  sourceId: string;
  ipAddress: string;
}

export interface DataExportJobData {
  exportId: string;
  organizationId: string;
  userId: string;
  type: 'csv' | 'pdf';
  filters?: {
    domainId?: string;
    startDate?: string;
    endDate?: string;
  };
}

export interface CleanupJobData {
  type: 'data_retention' | 'unverified_domains' | 'expired_sessions' | 'expired_exports';
  organizationId?: string; // If specified, only cleanup for this org
}

// Job result types
export interface GmailSyncResult {
  emailsProcessed: number;
  reportsFound: number;
  errors: string[];
}

export interface ReportParserResult {
  reportId: string;
  recordCount: number;
  totalMessages: number;
}

export interface AlertsResult {
  alertsCreated: number;
  notificationsSent: number;
}

export interface WebhookDeliveryResult {
  statusCode: number;
  success: boolean;
  responseTime: number;
}

export interface CleanupResult {
  deletedRecords: number;
  deletedDomains: number;
  deletedSessions: number;
  deletedExports: number;
}
