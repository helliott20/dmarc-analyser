ALTER TABLE "user_preferences" ADD COLUMN "email_alert_severity" varchar(50) DEFAULT 'warning,critical' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "email_digest_frequency" varchar(20) DEFAULT 'weekly' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "email_quiet_hours_start" integer;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "email_quiet_hours_end" integer;