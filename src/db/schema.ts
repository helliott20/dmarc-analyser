import {
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  bigint,
  boolean,
  pgEnum,
  jsonb,
  index,
  uniqueIndex,
  uuid,
  inet,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============ ENUMS ============

export const dispositionEnum = pgEnum('disposition', ['none', 'quarantine', 'reject']);
export const dmarcResultEnum = pgEnum('dmarc_result', ['pass', 'fail']);
export const dkimResultEnum = pgEnum('dkim_result', ['none', 'pass', 'fail', 'policy', 'neutral', 'temperror', 'permerror']);
export const spfResultEnum = pgEnum('spf_result', ['none', 'pass', 'fail', 'softfail', 'neutral', 'temperror', 'permerror']);
export const alignmentModeEnum = pgEnum('alignment_mode', ['r', 's']); // relaxed, strict
export const policyEnum = pgEnum('policy', ['none', 'quarantine', 'reject']);
export const sourceTypeEnum = pgEnum('source_type', ['legitimate', 'suspicious', 'unknown', 'forwarded']);
export const alertTypeEnum = pgEnum('alert_type', ['pass_rate_drop', 'new_source', 'dmarc_failure_spike', 'dns_change', 'auth_failure_spike', 'policy_change', 'compliance_drop']);
export const alertSeverityEnum = pgEnum('alert_severity', ['info', 'warning', 'critical']);
export const memberRoleEnum = pgEnum('member_role', ['owner', 'admin', 'member', 'viewer']);
export const verificationMethodEnum = pgEnum('verification_method', ['dns_txt', 'dns_cname']);
export const feedbackTypeEnum = pgEnum('feedback_type', ['auth-failure', 'fraud', 'abuse', 'not-spam', 'virus', 'other']);
export const exportTypeEnum = pgEnum('export_type', ['reports', 'sources', 'timeline', 'all']);
export const exportStatusEnum = pgEnum('export_status', ['pending', 'processing', 'complete', 'failed']);

// ============ USERS & AUTH ============

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  emailVerified: timestamp('email_verified'),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('users_email_idx').on(table.email),
]);

export const accounts = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: varchar('type', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 255 }).notNull(),
  providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: varchar('token_type', { length: 255 }),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: varchar('session_state', { length: 255 }),
}, (table) => [
  uniqueIndex('accounts_provider_idx').on(table.provider, table.providerAccountId),
]);

export const sessions = pgTable('sessions', {
  sessionToken: varchar('session_token', { length: 255 }).primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  expires: timestamp('expires').notNull(),
});

export const verificationTokens = pgTable('verification_tokens', {
  identifier: varchar('identifier', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expires: timestamp('expires').notNull(),
}, (table) => [
  uniqueIndex('verification_tokens_idx').on(table.identifier, table.token),
]);

// ============ USER PREFERENCES ============

export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),

  // Notification preferences
  emailLoginAlerts: boolean('email_login_alerts').default(true).notNull(),
  emailWeeklyDigest: boolean('email_weekly_digest').default(true).notNull(),
  emailAlertNotifications: boolean('email_alert_notifications').default(true).notNull(),

  // Appearance preferences
  theme: varchar('theme', { length: 20 }).default('system').notNull(), // 'light', 'dark', 'system'

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('user_preferences_user_idx').on(table.userId),
]);

// ============ ORGANIZATIONS ============

export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  billingEmail: varchar('billing_email', { length: 255 }),

  // Branding
  logoUrl: text('logo_url'),
  faviconUrl: text('favicon_url'),
  primaryColor: varchar('primary_color', { length: 7 }).default('#3B82F6'),
  accentColor: varchar('accent_color', { length: 7 }).default('#10B981'),

  // Settings
  dataRetentionDays: integer('data_retention_days').default(365),
  timezone: varchar('timezone', { length: 50 }).default('UTC'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('organizations_slug_idx').on(table.slug),
]);

export const orgMembers = pgTable('org_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  role: memberRoleEnum('role').default('member').notNull(),
  invitedBy: uuid('invited_by').references(() => users.id),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('org_members_idx').on(table.userId, table.organizationId),
]);

export const invitations = pgTable('invitations', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  role: memberRoleEnum('role').default('member').notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  invitedBy: uuid('invited_by').references(() => users.id).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('invitations_email_idx').on(table.email),
  index('invitations_token_idx').on(table.token),
]);

// ============ GMAIL ACCOUNTS ============

export const gmailAccounts = pgTable('gmail_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  tokenExpiry: timestamp('token_expiry'),
  lastSyncAt: timestamp('last_sync_at'),
  syncEnabled: boolean('sync_enabled').default(true).notNull(),
  sendEnabled: boolean('send_enabled').default(false).notNull(), // Whether account is authorized for sending
  notifyNewDomains: boolean('notify_new_domains').default(true).notNull(), // Email notify when new domains discovered
  notifyVerificationLapse: boolean('notify_verification_lapse').default(true).notNull(), // Email notify when domain verification lapses
  archiveLabelId: varchar('archive_label_id', { length: 100 }),
  // Sync progress tracking
  syncStatus: varchar('sync_status', { length: 20 }).default('idle'), // 'idle' | 'syncing'
  syncProgress: jsonb('sync_progress'), // { imported, skipped, errors, batchesProcessed }
  syncStartedAt: timestamp('sync_started_at'),
  addedBy: uuid('added_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('gmail_accounts_org_email_idx').on(table.organizationId, table.email),
]);

// ============ DOMAINS ============

export const domains = pgTable('domains', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  domain: varchar('domain', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 255 }),

  // Verification
  verificationToken: varchar('verification_token', { length: 100 }),
  verificationMethod: verificationMethodEnum('verification_method').default('dns_txt'),
  verifiedAt: timestamp('verified_at'),
  verifiedBy: uuid('verified_by').references(() => users.id),
  verificationLapsedAt: timestamp('verification_lapsed_at'), // Set when verification TXT record is no longer found
  verificationLapseNotifiedAt: timestamp('verification_lapse_notified_at'), // When we last sent a lapse notification

  // DNS Records (cached)
  dmarcRecord: text('dmarc_record'),
  spfRecord: text('spf_record'),
  lastDnsCheck: timestamp('last_dns_check'),

  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('domains_org_domain_idx').on(table.organizationId, table.domain),
  index('domains_domain_idx').on(table.domain),
]);

// ============ DOMAIN TAGS ============

export const domainTags = pgTable('domain_tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 50 }).notNull(),
  color: varchar('color', { length: 7 }).default('#6b7280').notNull(), // hex color
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('domain_tags_org_name_idx').on(table.organizationId, table.name),
]);

export const domainTagAssignments = pgTable('domain_tag_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  domainId: uuid('domain_id').references(() => domains.id, { onDelete: 'cascade' }).notNull(),
  tagId: uuid('tag_id').references(() => domainTags.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('domain_tag_assignments_idx').on(table.domainId, table.tagId),
]);

// ============ SUBDOMAINS ============

export const subdomains = pgTable('subdomains', {
  id: uuid('id').defaultRandom().primaryKey(),
  domainId: uuid('domain_id').references(() => domains.id, { onDelete: 'cascade' }).notNull(),
  subdomain: varchar('subdomain', { length: 255 }).notNull(),
  policyOverride: policyEnum('policy_override'),
  firstSeen: timestamp('first_seen').defaultNow().notNull(),
  lastSeen: timestamp('last_seen').defaultNow().notNull(),
  messageCount: bigint('message_count', { mode: 'number' }).default(0).notNull(),
  passCount: bigint('pass_count', { mode: 'number' }).default(0).notNull(),
  failCount: bigint('fail_count', { mode: 'number' }).default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('subdomains_domain_sub_idx').on(table.domainId, table.subdomain),
]);

// ============ DMARC REPORTS (RUA) ============

export const reports = pgTable('reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  domainId: uuid('domain_id').references(() => domains.id, { onDelete: 'cascade' }).notNull(),

  // Report metadata
  reportId: varchar('report_id', { length: 255 }).notNull(),
  orgName: varchar('org_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  extraContactInfo: text('extra_contact_info'),
  dateRangeBegin: timestamp('date_range_begin').notNull(),
  dateRangeEnd: timestamp('date_range_end').notNull(),

  // Policy published
  policyDomain: varchar('policy_domain', { length: 255 }).notNull(),
  policyAdkim: alignmentModeEnum('policy_adkim').default('r'),
  policyAspf: alignmentModeEnum('policy_aspf').default('r'),
  policyP: policyEnum('policy_p').default('none'),
  policySp: policyEnum('policy_sp'),
  policyPct: integer('policy_pct').default(100),

  // Metadata
  rawXml: text('raw_xml'),
  gmailMessageId: varchar('gmail_message_id', { length: 100 }),
  importedAt: timestamp('imported_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('reports_domain_date_idx').on(table.domainId, table.dateRangeBegin),
  uniqueIndex('reports_report_id_org_idx').on(table.reportId, table.orgName),
]);

// ============ REPORT RECORDS ============

export const records = pgTable('records', {
  id: uuid('id').defaultRandom().primaryKey(),
  reportId: uuid('report_id').references(() => reports.id, { onDelete: 'cascade' }).notNull(),

  // Row data
  sourceIp: inet('source_ip').notNull(),
  count: integer('count').notNull(),

  // Policy evaluated
  disposition: dispositionEnum('disposition').notNull(),
  dmarcDkim: dmarcResultEnum('dmarc_dkim'),
  dmarcSpf: dmarcResultEnum('dmarc_spf'),
  policyOverrideReason: jsonb('policy_override_reason'),

  // Identifiers
  headerFrom: varchar('header_from', { length: 255 }),
  envelopeFrom: varchar('envelope_from', { length: 255 }),
  envelopeTo: varchar('envelope_to', { length: 255 }),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('records_report_idx').on(table.reportId),
  index('records_source_ip_idx').on(table.sourceIp),
]);

export const dkimResults = pgTable('dkim_results', {
  id: uuid('id').defaultRandom().primaryKey(),
  recordId: uuid('record_id').references(() => records.id, { onDelete: 'cascade' }).notNull(),
  domain: varchar('domain', { length: 255 }).notNull(),
  selector: varchar('selector', { length: 255 }),
  result: dkimResultEnum('result').notNull(),
  humanResult: text('human_result'),
});

export const spfResults = pgTable('spf_results', {
  id: uuid('id').defaultRandom().primaryKey(),
  recordId: uuid('record_id').references(() => records.id, { onDelete: 'cascade' }).notNull(),
  domain: varchar('domain', { length: 255 }).notNull(),
  scope: varchar('scope', { length: 50 }).default('mfrom'),
  result: spfResultEnum('result').notNull(),
  humanResult: text('human_result'),
});

// ============ FORENSIC REPORTS (RUF) ============

export const forensicReports = pgTable('forensic_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  domainId: uuid('domain_id').references(() => domains.id, { onDelete: 'cascade' }).notNull(),

  // Report metadata
  reportId: varchar('report_id', { length: 255 }),
  feedbackType: feedbackTypeEnum('feedback_type'),
  reporterOrgName: varchar('reporter_org_name', { length: 255 }),
  userAgent: varchar('user_agent', { length: 255 }),
  version: varchar('version', { length: 10 }),

  // Original mail info
  originalMailFrom: varchar('original_mail_from', { length: 255 }),
  originalRcptTo: varchar('original_rcpt_to', { length: 255 }),
  arrivalDate: timestamp('arrival_date'),
  sourceIp: inet('source_ip'),

  // Authentication results (stored as JSONB for flexibility)
  authResults: jsonb('auth_results'),
  deliveryResult: varchar('delivery_result', { length: 50 }),

  // DKIM/SPF results
  dkimDomain: varchar('dkim_domain', { length: 255 }),
  dkimResult: dkimResultEnum('dkim_result'),
  spfDomain: varchar('spf_domain', { length: 255 }),
  spfResult: spfResultEnum('spf_result'),

  // Message details (may contain PII - handle with care)
  subject: text('subject'),
  messageId: varchar('message_id', { length: 255 }),

  rawReport: text('raw_report'),
  gmailMessageId: varchar('gmail_message_id', { length: 100 }),
  importedAt: timestamp('imported_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('forensic_reports_domain_idx').on(table.domainId),
  index('forensic_reports_arrival_idx').on(table.arrivalDate),
  index('forensic_reports_source_ip_idx').on(table.sourceIp),
  index('forensic_reports_feedback_type_idx').on(table.feedbackType),
]);

// ============ SOURCES (AGGREGATED) ============

export const sources = pgTable('sources', {
  id: uuid('id').defaultRandom().primaryKey(),
  domainId: uuid('domain_id').references(() => domains.id, { onDelete: 'cascade' }).notNull(),
  sourceIp: inet('source_ip').notNull(),

  // IP Info
  hostname: varchar('hostname', { length: 255 }),
  organization: varchar('organization', { length: 255 }),

  // Geolocation
  country: varchar('country', { length: 2 }),
  city: varchar('city', { length: 100 }),
  region: varchar('region', { length: 100 }),

  // ASN
  asn: varchar('asn', { length: 20 }),
  asnOrg: varchar('asn_org', { length: 255 }),

  // Classification
  sourceType: sourceTypeEnum('source_type').default('unknown').notNull(),
  knownSenderId: uuid('known_sender_id').references(() => knownSenders.id),
  notes: text('notes'),
  classifiedBy: uuid('classified_by').references(() => users.id),
  classifiedAt: timestamp('classified_at'),

  // Aggregated stats
  totalMessages: bigint('total_messages', { mode: 'number' }).default(0).notNull(),
  passedMessages: bigint('passed_messages', { mode: 'number' }).default(0).notNull(),
  failedMessages: bigint('failed_messages', { mode: 'number' }).default(0).notNull(),
  firstSeen: timestamp('first_seen'),
  lastSeen: timestamp('last_seen'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('sources_domain_ip_idx').on(table.domainId, table.sourceIp),
  index('sources_type_idx').on(table.sourceType),
]);

// ============ KNOWN SENDERS ============

export const knownSenders = pgTable('known_senders', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 50 }).notNull(), // marketing, transactional, corporate, security
  logoUrl: text('logo_url'),
  website: varchar('website', { length: 255 }),
  ipRanges: jsonb('ip_ranges'), // Array of CIDR ranges
  dkimDomains: jsonb('dkim_domains'), // Array of domains
  spfInclude: varchar('spf_include', { length: 255 }), // SPF include domain (e.g., "_spf.google.com")
  spfResolvedAt: timestamp('spf_resolved_at'), // When IPs were last resolved from SPF
  isGlobal: boolean('is_global').default(true).notNull(), // System-wide vs org-specific
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('known_senders_name_idx').on(table.name),
  index('known_senders_category_idx').on(table.category),
]);

// ============ ALERTS ============

export const alerts = pgTable('alerts', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  domainId: uuid('domain_id').references(() => domains.id, { onDelete: 'cascade' }),
  type: alertTypeEnum('type').notNull(),
  severity: alertSeverityEnum('severity').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  metadata: jsonb('metadata'),
  isRead: boolean('is_read').default(false).notNull(),
  readBy: uuid('read_by').references(() => users.id),
  readAt: timestamp('read_at'),
  isDismissed: boolean('is_dismissed').default(false).notNull(),
  dismissedBy: uuid('dismissed_by').references(() => users.id),
  dismissedAt: timestamp('dismissed_at'),
  emailSent: boolean('email_sent').default(false).notNull(),
  webhookSent: boolean('webhook_sent').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('alerts_org_unread_idx').on(table.organizationId, table.isRead),
  index('alerts_domain_idx').on(table.domainId),
  index('alerts_created_idx').on(table.createdAt),
]);

export const alertRules = pgTable('alert_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  domainId: uuid('domain_id').references(() => domains.id, { onDelete: 'cascade' }), // null = org-wide
  type: alertTypeEnum('type').notNull(),
  threshold: jsonb('threshold'), // e.g., { passRate: 90, period: '24h' }
  isEnabled: boolean('is_enabled').default(true).notNull(),
  notifyEmail: boolean('notify_email').default(true).notNull(),
  notifyWebhook: boolean('notify_webhook').default(false).notNull(),
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('alert_rules_org_idx').on(table.organizationId),
  index('alert_rules_domain_idx').on(table.domainId),
  index('alert_rules_enabled_idx').on(table.isEnabled),
]);

// ============ AUDIT LOGS ============

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 100 }).notNull(), // e.g., 'domain.create', 'member.invite', 'settings.update'
  entityType: varchar('entity_type', { length: 50 }).notNull(), // e.g., 'domain', 'member', 'organization'
  entityId: uuid('entity_id'),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('audit_logs_org_idx').on(table.organizationId),
  index('audit_logs_user_idx').on(table.userId),
  index('audit_logs_action_idx').on(table.action),
  index('audit_logs_created_idx').on(table.createdAt),
]);

// ============ API KEYS ============

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),

  name: varchar('name', { length: 255 }).notNull(),
  keyPrefix: varchar('key_prefix', { length: 8 }).notNull(), // First 8 chars for identification (e.g., "dmarc_ab")
  keyHash: varchar('key_hash', { length: 64 }).notNull(), // SHA-256 hash of full key

  scopes: text('scopes').notNull(), // JSON array: ['read:domains', 'read:reports', 'read:sources', 'write:domains']

  lastUsedAt: timestamp('last_used_at'),
  expiresAt: timestamp('expires_at'),
  isActive: boolean('is_active').default(true),

  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('api_keys_org_idx').on(table.organizationId),
  index('api_keys_hash_idx').on(table.keyHash),
]);

// ============ WEBHOOKS ============

export const webhooks = pgTable('webhooks', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),

  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(), // 'slack', 'discord', 'teams', 'custom'
  url: text('url').notNull(),
  secret: varchar('secret', { length: 64 }), // For custom webhooks, HMAC signing

  // Event filters
  events: text('events').notNull(), // JSON array: ['alert.created', 'report.received', 'source.new']
  severityFilter: text('severity_filter'), // JSON array: ['critical', 'warning'] or null for all
  domainFilter: uuid('domain_filter').references(() => domains.id), // null = all domains

  isActive: boolean('is_active').default(true).notNull(),
  lastTriggeredAt: timestamp('last_triggered_at'),
  failureCount: integer('failure_count').default(0).notNull(),

  createdBy: uuid('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('webhooks_org_idx').on(table.organizationId),
]);

// ============ SCHEDULED REPORTS ============

export const scheduledReports = pgTable('scheduled_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  domainId: uuid('domain_id').references(() => domains.id, { onDelete: 'cascade' }), // null = all domains

  name: varchar('name', { length: 255 }).notNull(),
  frequency: varchar('frequency', { length: 20 }).notNull(), // 'daily', 'weekly', 'monthly'
  dayOfWeek: integer('day_of_week'), // 0-6 for weekly (0 = Sunday)
  dayOfMonth: integer('day_of_month'), // 1-31 for monthly
  hour: integer('hour').default(9).notNull(), // Hour to send (0-23)
  timezone: varchar('timezone', { length: 50 }).default('UTC'),

  recipients: text('recipients').notNull(), // JSON array of emails
  includeCharts: boolean('include_charts').default(true),
  includeSources: boolean('include_sources').default(true),
  includeFailures: boolean('include_failures').default(true),

  lastSentAt: timestamp('last_sent_at'),
  nextRunAt: timestamp('next_run_at'),
  isActive: boolean('is_active').default(true),

  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('scheduled_reports_org_idx').on(table.organizationId),
  index('scheduled_reports_next_run_idx').on(table.nextRunAt),
]);

// ============ DATA EXPORTS ============

export const dataExports = pgTable('data_exports', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),

  type: exportTypeEnum('type').notNull(),
  status: exportStatusEnum('status').default('pending').notNull(),

  // Filters applied
  filters: jsonb('filters'), // { dateFrom, dateTo, domainId }

  // File info
  fileUrl: text('file_url'), // Storage path or URL when complete
  fileSize: integer('file_size'), // Size in bytes

  // Metadata
  recordCount: integer('record_count'), // Number of records exported
  error: text('error'), // Error message if failed

  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  expiresAt: timestamp('expires_at'), // When the file will be deleted (7 days after creation)
}, (table) => [
  index('data_exports_org_idx').on(table.organizationId),
  index('data_exports_status_idx').on(table.status),
  index('data_exports_created_idx').on(table.createdAt),
]);

// ============ AI INTEGRATIONS ============

export const aiIntegrations = pgTable('ai_integrations', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull().unique(),

  // Gemini API key (stored like Gmail tokens)
  geminiApiKey: text('gemini_api_key'),
  geminiApiKeySetAt: timestamp('gemini_api_key_set_at'),

  // Usage tracking for rate limiting
  lastUsedAt: timestamp('last_used_at'),
  usageCount24h: integer('usage_count_24h').default(0).notNull(),
  usageResetAt: timestamp('usage_reset_at'),

  // Status
  isEnabled: boolean('is_enabled').default(true).notNull(),
  lastError: text('last_error'),
  lastErrorAt: timestamp('last_error_at'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('ai_integrations_org_idx').on(table.organizationId),
]);

// ============ AI RECOMMENDATIONS CACHE ============

export const aiRecommendationsCache = pgTable('ai_recommendations_cache', {
  id: uuid('id').defaultRandom().primaryKey(),
  domainId: uuid('domain_id').references(() => domains.id, { onDelete: 'cascade' }).notNull().unique(),

  // Cached response
  recommendation: jsonb('recommendation').notNull(),
  inputHash: varchar('input_hash', { length: 64 }).notNull(), // SHA-256 of input context

  // Metadata
  generatedAt: timestamp('generated_at').notNull(),
  expiresAt: timestamp('expires_at').notNull(), // 24 hours from generation

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('ai_cache_domain_idx').on(table.domainId),
  index('ai_cache_expires_idx').on(table.expiresAt),
]);

// ============ RELATIONS ============

export const usersRelations = relations(users, ({ one, many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  orgMembers: many(orgMembers),
  createdOrganizations: many(organizations),
  preferences: one(userPreferences, { fields: [users.id], references: [userPreferences.userId] }),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, { fields: [userPreferences.userId], references: [users.id] }),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  creator: one(users, { fields: [organizations.createdBy], references: [users.id] }),
  members: many(orgMembers),
  domains: many(domains),
  gmailAccounts: many(gmailAccounts),
  alerts: many(alerts),
  alertRules: many(alertRules),
  auditLogs: many(auditLogs),
  apiKeys: many(apiKeys),
  webhooks: many(webhooks),
  scheduledReports: many(scheduledReports),
  dataExports: many(dataExports),
  invitations: many(invitations),
  aiIntegration: one(aiIntegrations, { fields: [organizations.id], references: [aiIntegrations.organizationId] }),
}));

export const orgMembersRelations = relations(orgMembers, ({ one }) => ({
  user: one(users, { fields: [orgMembers.userId], references: [users.id] }),
  organization: one(organizations, { fields: [orgMembers.organizationId], references: [organizations.id] }),
  inviter: one(users, { fields: [orgMembers.invitedBy], references: [users.id] }),
}));

export const domainsRelations = relations(domains, ({ one, many }) => ({
  organization: one(organizations, { fields: [domains.organizationId], references: [organizations.id] }),
  verifier: one(users, { fields: [domains.verifiedBy], references: [users.id] }),
  reports: many(reports),
  forensicReports: many(forensicReports),
  sources: many(sources),
  subdomains: many(subdomains),
  alerts: many(alerts),
  alertRules: many(alertRules),
  aiRecommendationCache: one(aiRecommendationsCache, { fields: [domains.id], references: [aiRecommendationsCache.domainId] }),
}));

export const reportsRelations = relations(reports, ({ one, many }) => ({
  domain: one(domains, { fields: [reports.domainId], references: [domains.id] }),
  records: many(records),
}));

export const recordsRelations = relations(records, ({ one, many }) => ({
  report: one(reports, { fields: [records.reportId], references: [reports.id] }),
  dkimResults: many(dkimResults),
  spfResults: many(spfResults),
}));

export const dkimResultsRelations = relations(dkimResults, ({ one }) => ({
  record: one(records, { fields: [dkimResults.recordId], references: [records.id] }),
}));

export const spfResultsRelations = relations(spfResults, ({ one }) => ({
  record: one(records, { fields: [spfResults.recordId], references: [records.id] }),
}));

export const forensicReportsRelations = relations(forensicReports, ({ one }) => ({
  domain: one(domains, { fields: [forensicReports.domainId], references: [domains.id] }),
}));

export const sourcesRelations = relations(sources, ({ one }) => ({
  domain: one(domains, { fields: [sources.domainId], references: [domains.id] }),
  knownSender: one(knownSenders, { fields: [sources.knownSenderId], references: [knownSenders.id] }),
  classifier: one(users, { fields: [sources.classifiedBy], references: [users.id] }),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  organization: one(organizations, { fields: [alerts.organizationId], references: [organizations.id] }),
  domain: one(domains, { fields: [alerts.domainId], references: [domains.id] }),
  reader: one(users, { fields: [alerts.readBy], references: [users.id] }),
  dismisser: one(users, { fields: [alerts.dismissedBy], references: [users.id] }),
}));

export const alertRulesRelations = relations(alertRules, ({ one }) => ({
  organization: one(organizations, { fields: [alertRules.organizationId], references: [organizations.id] }),
  domain: one(domains, { fields: [alertRules.domainId], references: [domains.id] }),
  creator: one(users, { fields: [alertRules.createdBy], references: [users.id] }),
}));

export const subdomainsRelations = relations(subdomains, ({ one }) => ({
  domain: one(domains, { fields: [subdomains.domainId], references: [domains.id] }),
}));

export const aiIntegrationsRelations = relations(aiIntegrations, ({ one }) => ({
  organization: one(organizations, { fields: [aiIntegrations.organizationId], references: [organizations.id] }),
}));

export const aiRecommendationsCacheRelations = relations(aiRecommendationsCache, ({ one }) => ({
  domain: one(domains, { fields: [aiRecommendationsCache.domainId], references: [domains.id] }),
}));
