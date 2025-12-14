CREATE TYPE "public"."alert_severity" AS ENUM('info', 'warning', 'critical');--> statement-breakpoint
CREATE TYPE "public"."alert_type" AS ENUM('pass_rate_drop', 'new_source', 'dmarc_failure_spike', 'dns_change', 'auth_failure_spike', 'policy_change', 'compliance_drop');--> statement-breakpoint
CREATE TYPE "public"."alignment_mode" AS ENUM('r', 's');--> statement-breakpoint
CREATE TYPE "public"."disposition" AS ENUM('none', 'quarantine', 'reject');--> statement-breakpoint
CREATE TYPE "public"."dkim_result" AS ENUM('none', 'pass', 'fail', 'policy', 'neutral', 'temperror', 'permerror');--> statement-breakpoint
CREATE TYPE "public"."dmarc_result" AS ENUM('pass', 'fail');--> statement-breakpoint
CREATE TYPE "public"."export_status" AS ENUM('pending', 'processing', 'complete', 'failed');--> statement-breakpoint
CREATE TYPE "public"."export_type" AS ENUM('reports', 'sources', 'timeline', 'all');--> statement-breakpoint
CREATE TYPE "public"."feedback_type" AS ENUM('auth-failure', 'fraud', 'abuse', 'not-spam', 'virus', 'other');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('owner', 'admin', 'member', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."policy" AS ENUM('none', 'quarantine', 'reject');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('legitimate', 'suspicious', 'unknown', 'forwarded');--> statement-breakpoint
CREATE TYPE "public"."spf_result" AS ENUM('none', 'pass', 'fail', 'softfail', 'neutral', 'temperror', 'permerror');--> statement-breakpoint
CREATE TYPE "public"."verification_method" AS ENUM('dns_txt', 'dns_cname');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(255) NOT NULL,
	"provider" varchar(255) NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" varchar(255),
	"scope" text,
	"id_token" text,
	"session_state" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "ai_integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"gemini_api_key" text,
	"gemini_api_key_set_at" timestamp,
	"last_used_at" timestamp,
	"usage_count_24h" integer DEFAULT 0 NOT NULL,
	"usage_reset_at" timestamp,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"last_error" text,
	"last_error_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_integrations_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
CREATE TABLE "ai_recommendations_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain_id" uuid NOT NULL,
	"recommendation" jsonb NOT NULL,
	"input_hash" varchar(64) NOT NULL,
	"generated_at" timestamp NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_recommendations_cache_domain_id_unique" UNIQUE("domain_id")
);
--> statement-breakpoint
CREATE TABLE "alert_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"domain_id" uuid,
	"type" "alert_type" NOT NULL,
	"threshold" jsonb,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"notify_email" boolean DEFAULT true NOT NULL,
	"notify_webhook" boolean DEFAULT false NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"domain_id" uuid,
	"type" "alert_type" NOT NULL,
	"severity" "alert_severity" NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_by" uuid,
	"read_at" timestamp,
	"is_dismissed" boolean DEFAULT false NOT NULL,
	"dismissed_by" uuid,
	"dismissed_at" timestamp,
	"email_sent" boolean DEFAULT false NOT NULL,
	"webhook_sent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"key_prefix" varchar(8) NOT NULL,
	"key_hash" varchar(64) NOT NULL,
	"scopes" text NOT NULL,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid,
	"old_value" jsonb,
	"new_value" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"type" "export_type" NOT NULL,
	"status" "export_status" DEFAULT 'pending' NOT NULL,
	"filters" jsonb,
	"file_url" text,
	"file_size" integer,
	"record_count" integer,
	"error" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "dkim_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"record_id" uuid NOT NULL,
	"domain" varchar(255) NOT NULL,
	"selector" varchar(255),
	"result" "dkim_result" NOT NULL,
	"human_result" text
);
--> statement-breakpoint
CREATE TABLE "domain_tag_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domain_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(50) NOT NULL,
	"color" varchar(7) DEFAULT '#6b7280' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"domain" varchar(255) NOT NULL,
	"display_name" varchar(255),
	"verification_token" varchar(100),
	"verification_method" "verification_method" DEFAULT 'dns_txt',
	"verified_at" timestamp,
	"verified_by" uuid,
	"verification_lapsed_at" timestamp,
	"verification_lapse_notified_at" timestamp,
	"dmarc_record" text,
	"spf_record" text,
	"last_dns_check" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forensic_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain_id" uuid NOT NULL,
	"report_id" varchar(255),
	"feedback_type" "feedback_type",
	"reporter_org_name" varchar(255),
	"user_agent" varchar(255),
	"version" varchar(10),
	"original_mail_from" varchar(255),
	"original_rcpt_to" varchar(255),
	"arrival_date" timestamp,
	"source_ip" "inet",
	"auth_results" jsonb,
	"delivery_result" varchar(50),
	"dkim_domain" varchar(255),
	"dkim_result" "dkim_result",
	"spf_domain" varchar(255),
	"spf_result" "spf_result",
	"subject" text,
	"message_id" varchar(255),
	"raw_report" text,
	"gmail_message_id" varchar(100),
	"imported_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gmail_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"token_expiry" timestamp,
	"last_sync_at" timestamp,
	"sync_enabled" boolean DEFAULT true NOT NULL,
	"send_enabled" boolean DEFAULT false NOT NULL,
	"notify_new_domains" boolean DEFAULT true NOT NULL,
	"notify_verification_lapse" boolean DEFAULT true NOT NULL,
	"archive_label_id" varchar(100),
	"sync_status" varchar(20) DEFAULT 'idle',
	"sync_progress" jsonb,
	"sync_started_at" timestamp,
	"added_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"organization_id" uuid NOT NULL,
	"role" "member_role" DEFAULT 'member' NOT NULL,
	"token" varchar(255) NOT NULL,
	"invited_by" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "known_senders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(50) NOT NULL,
	"logo_url" text,
	"website" varchar(255),
	"ip_ranges" jsonb,
	"dkim_domains" jsonb,
	"spf_include" varchar(255),
	"spf_resolved_at" timestamp,
	"is_global" boolean DEFAULT true NOT NULL,
	"organization_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"role" "member_role" DEFAULT 'member' NOT NULL,
	"invited_by" uuid,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"created_by" uuid NOT NULL,
	"billing_email" varchar(255),
	"logo_url" text,
	"favicon_url" text,
	"primary_color" varchar(7) DEFAULT '#3B82F6',
	"accent_color" varchar(7) DEFAULT '#10B981',
	"data_retention_days" integer DEFAULT 365,
	"timezone" varchar(50) DEFAULT 'UTC',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"source_ip" "inet" NOT NULL,
	"count" integer NOT NULL,
	"disposition" "disposition" NOT NULL,
	"dmarc_dkim" "dmarc_result",
	"dmarc_spf" "dmarc_result",
	"policy_override_reason" jsonb,
	"header_from" varchar(255),
	"envelope_from" varchar(255),
	"envelope_to" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain_id" uuid NOT NULL,
	"report_id" varchar(255) NOT NULL,
	"org_name" varchar(255) NOT NULL,
	"email" varchar(255),
	"extra_contact_info" text,
	"date_range_begin" timestamp NOT NULL,
	"date_range_end" timestamp NOT NULL,
	"policy_domain" varchar(255) NOT NULL,
	"policy_adkim" "alignment_mode" DEFAULT 'r',
	"policy_aspf" "alignment_mode" DEFAULT 'r',
	"policy_p" "policy" DEFAULT 'none',
	"policy_sp" "policy",
	"policy_pct" integer DEFAULT 100,
	"raw_xml" text,
	"gmail_message_id" varchar(100),
	"imported_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"domain_id" uuid,
	"name" varchar(255) NOT NULL,
	"frequency" varchar(20) NOT NULL,
	"day_of_week" integer,
	"day_of_month" integer,
	"hour" integer DEFAULT 9 NOT NULL,
	"timezone" varchar(50) DEFAULT 'UTC',
	"recipients" text NOT NULL,
	"include_charts" boolean DEFAULT true,
	"include_sources" boolean DEFAULT true,
	"include_failures" boolean DEFAULT true,
	"last_sent_at" timestamp,
	"next_run_at" timestamp,
	"is_active" boolean DEFAULT true,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain_id" uuid NOT NULL,
	"source_ip" "inet" NOT NULL,
	"hostname" varchar(255),
	"organization" varchar(255),
	"country" varchar(2),
	"city" varchar(100),
	"region" varchar(100),
	"asn" varchar(20),
	"asn_org" varchar(255),
	"source_type" "source_type" DEFAULT 'unknown' NOT NULL,
	"known_sender_id" uuid,
	"notes" text,
	"classified_by" uuid,
	"classified_at" timestamp,
	"total_messages" bigint DEFAULT 0 NOT NULL,
	"passed_messages" bigint DEFAULT 0 NOT NULL,
	"failed_messages" bigint DEFAULT 0 NOT NULL,
	"first_seen" timestamp,
	"last_seen" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spf_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"record_id" uuid NOT NULL,
	"domain" varchar(255) NOT NULL,
	"scope" varchar(50) DEFAULT 'mfrom',
	"result" "spf_result" NOT NULL,
	"human_result" text
);
--> statement-breakpoint
CREATE TABLE "subdomains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain_id" uuid NOT NULL,
	"subdomain" varchar(255) NOT NULL,
	"policy_override" "policy",
	"first_seen" timestamp DEFAULT now() NOT NULL,
	"last_seen" timestamp DEFAULT now() NOT NULL,
	"message_count" bigint DEFAULT 0 NOT NULL,
	"pass_count" bigint DEFAULT 0 NOT NULL,
	"fail_count" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"email_login_alerts" boolean DEFAULT true NOT NULL,
	"email_weekly_digest" boolean DEFAULT true NOT NULL,
	"email_alert_notifications" boolean DEFAULT true NOT NULL,
	"theme" varchar(20) DEFAULT 'system' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"email_verified" timestamp,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(20) NOT NULL,
	"url" text NOT NULL,
	"secret" varchar(64),
	"events" text NOT NULL,
	"severity_filter" text,
	"domain_filter" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_triggered_at" timestamp,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_integrations" ADD CONSTRAINT "ai_integrations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_recommendations_cache" ADD CONSTRAINT "ai_recommendations_cache_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_read_by_users_id_fk" FOREIGN KEY ("read_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_dismissed_by_users_id_fk" FOREIGN KEY ("dismissed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_exports" ADD CONSTRAINT "data_exports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_exports" ADD CONSTRAINT "data_exports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dkim_results" ADD CONSTRAINT "dkim_results_record_id_records_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_tag_assignments" ADD CONSTRAINT "domain_tag_assignments_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_tag_assignments" ADD CONSTRAINT "domain_tag_assignments_tag_id_domain_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."domain_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_tags" ADD CONSTRAINT "domain_tags_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domains" ADD CONSTRAINT "domains_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domains" ADD CONSTRAINT "domains_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forensic_reports" ADD CONSTRAINT "forensic_reports_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gmail_accounts" ADD CONSTRAINT "gmail_accounts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gmail_accounts" ADD CONSTRAINT "gmail_accounts_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "known_senders" ADD CONSTRAINT "known_senders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "records" ADD CONSTRAINT "records_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_reports" ADD CONSTRAINT "scheduled_reports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_reports" ADD CONSTRAINT "scheduled_reports_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_reports" ADD CONSTRAINT "scheduled_reports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_known_sender_id_known_senders_id_fk" FOREIGN KEY ("known_sender_id") REFERENCES "public"."known_senders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_classified_by_users_id_fk" FOREIGN KEY ("classified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spf_results" ADD CONSTRAINT "spf_results_record_id_records_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subdomains" ADD CONSTRAINT "subdomains_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_domain_filter_domains_id_fk" FOREIGN KEY ("domain_filter") REFERENCES "public"."domains"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_idx" ON "accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_integrations_org_idx" ON "ai_integrations" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_cache_domain_idx" ON "ai_recommendations_cache" USING btree ("domain_id");--> statement-breakpoint
CREATE INDEX "ai_cache_expires_idx" ON "ai_recommendations_cache" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "alert_rules_org_idx" ON "alert_rules" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "alert_rules_domain_idx" ON "alert_rules" USING btree ("domain_id");--> statement-breakpoint
CREATE INDEX "alert_rules_enabled_idx" ON "alert_rules" USING btree ("is_enabled");--> statement-breakpoint
CREATE INDEX "alerts_org_unread_idx" ON "alerts" USING btree ("organization_id","is_read");--> statement-breakpoint
CREATE INDEX "alerts_domain_idx" ON "alerts" USING btree ("domain_id");--> statement-breakpoint
CREATE INDEX "alerts_created_idx" ON "alerts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "api_keys_org_idx" ON "api_keys" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "api_keys_hash_idx" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "audit_logs_org_idx" ON "audit_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "audit_logs_user_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "data_exports_org_idx" ON "data_exports" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "data_exports_status_idx" ON "data_exports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "data_exports_created_idx" ON "data_exports" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "domain_tag_assignments_idx" ON "domain_tag_assignments" USING btree ("domain_id","tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "domain_tags_org_name_idx" ON "domain_tags" USING btree ("organization_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "domains_org_domain_idx" ON "domains" USING btree ("organization_id","domain");--> statement-breakpoint
CREATE INDEX "domains_domain_idx" ON "domains" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "forensic_reports_domain_idx" ON "forensic_reports" USING btree ("domain_id");--> statement-breakpoint
CREATE INDEX "forensic_reports_arrival_idx" ON "forensic_reports" USING btree ("arrival_date");--> statement-breakpoint
CREATE INDEX "forensic_reports_source_ip_idx" ON "forensic_reports" USING btree ("source_ip");--> statement-breakpoint
CREATE INDEX "forensic_reports_feedback_type_idx" ON "forensic_reports" USING btree ("feedback_type");--> statement-breakpoint
CREATE UNIQUE INDEX "gmail_accounts_org_email_idx" ON "gmail_accounts" USING btree ("organization_id","email");--> statement-breakpoint
CREATE INDEX "invitations_email_idx" ON "invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "invitations_token_idx" ON "invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "known_senders_name_idx" ON "known_senders" USING btree ("name");--> statement-breakpoint
CREATE INDEX "known_senders_category_idx" ON "known_senders" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "org_members_idx" ON "org_members" USING btree ("user_id","organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_idx" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "records_report_idx" ON "records" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "records_source_ip_idx" ON "records" USING btree ("source_ip");--> statement-breakpoint
CREATE INDEX "reports_domain_date_idx" ON "reports" USING btree ("domain_id","date_range_begin");--> statement-breakpoint
CREATE UNIQUE INDEX "reports_report_id_org_idx" ON "reports" USING btree ("report_id","org_name");--> statement-breakpoint
CREATE INDEX "scheduled_reports_org_idx" ON "scheduled_reports" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "scheduled_reports_next_run_idx" ON "scheduled_reports" USING btree ("next_run_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sources_domain_ip_idx" ON "sources" USING btree ("domain_id","source_ip");--> statement-breakpoint
CREATE INDEX "sources_type_idx" ON "sources" USING btree ("source_type");--> statement-breakpoint
CREATE UNIQUE INDEX "subdomains_domain_sub_idx" ON "subdomains" USING btree ("domain_id","subdomain");--> statement-breakpoint
CREATE UNIQUE INDEX "user_preferences_user_idx" ON "user_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_tokens_idx" ON "verification_tokens" USING btree ("identifier","token");--> statement-breakpoint
CREATE INDEX "webhooks_org_idx" ON "webhooks" USING btree ("organization_id");