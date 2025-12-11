import { Queue } from 'bullmq';
import { connectionOptions } from '../redis';

// Queue names
export const QUEUE_NAMES = {
  GMAIL_SYNC: 'gmail-sync',
  REPORT_PARSER: 'report-parser',
  SOURCE_AGGREGATOR: 'source-aggregator',
  ALERTS: 'alerts',
  DNS_CHECK: 'dns-check',
  WEBHOOK_DELIVERY: 'webhook-delivery',
  SCHEDULED_REPORTS: 'scheduled-reports',
  IP_ENRICHMENT: 'ip-enrichment',
  DATA_EXPORT: 'data-export',
  CLEANUP: 'cleanup',
} as const;

// Gmail sync queue - fetch DMARC emails
export const gmailSyncQueue = new Queue(QUEUE_NAMES.GMAIL_SYNC, {
  ...connectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

// Report parser queue - parse XML reports
export const reportParserQueue = new Queue(QUEUE_NAMES.REPORT_PARSER, {
  ...connectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
  },
});

// Source aggregator queue - aggregate source statistics
export const sourceAggregatorQueue = new Queue(QUEUE_NAMES.SOURCE_AGGREGATOR, {
  ...connectionOptions,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 100 },
  },
});

// Alerts queue - check for alert conditions and send notifications
export const alertsQueue = new Queue(QUEUE_NAMES.ALERTS, {
  ...connectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 500 },
  },
});

// DNS check queue - verify DNS records periodically
export const dnsCheckQueue = new Queue(QUEUE_NAMES.DNS_CHECK, {
  ...connectionOptions,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
});

// Webhook delivery queue - deliver webhook payloads with retry
export const webhookDeliveryQueue = new Queue(QUEUE_NAMES.WEBHOOK_DELIVERY, {
  ...connectionOptions,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 2000 },
  },
});

// Scheduled reports queue - generate and send scheduled reports
export const scheduledReportsQueue = new Queue(QUEUE_NAMES.SCHEDULED_REPORTS, {
  ...connectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 60000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
});

// IP enrichment queue - fetch geolocation for source IPs
export const ipEnrichmentQueue = new Queue(QUEUE_NAMES.IP_ENRICHMENT, {
  ...connectionOptions,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 30000, // 30s, 60s, 120s, 240s - handles rate limit (429) gracefully
    },
    removeOnComplete: { count: 2000 }, // Keep more completed jobs for visibility
    removeOnFail: { count: 1000 },
  },
});

// Data export queue - generate CSV/PDF exports
export const dataExportQueue = new Queue(QUEUE_NAMES.DATA_EXPORT, {
  ...connectionOptions,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 100 },
  },
});

// Cleanup queue - delete expired data, unverified domains
export const cleanupQueue = new Queue(QUEUE_NAMES.CLEANUP, {
  ...connectionOptions,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { count: 30 },
    removeOnFail: { count: 50 },
  },
});

// Export all queues
export const queues = {
  gmailSync: gmailSyncQueue,
  reportParser: reportParserQueue,
  sourceAggregator: sourceAggregatorQueue,
  alerts: alertsQueue,
  dnsCheck: dnsCheckQueue,
  webhookDelivery: webhookDeliveryQueue,
  scheduledReports: scheduledReportsQueue,
  ipEnrichment: ipEnrichmentQueue,
  dataExport: dataExportQueue,
  cleanup: cleanupQueue,
};
