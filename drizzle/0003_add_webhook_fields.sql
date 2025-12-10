-- Add new fields to webhooks table for enhanced webhook functionality

-- Add name field (required)
ALTER TABLE "webhooks" ADD COLUMN IF NOT EXISTS "name" varchar(255) NOT NULL DEFAULT 'Webhook';

-- Add type field (required) - slack, discord, teams, or custom
ALTER TABLE "webhooks" ADD COLUMN IF NOT EXISTS "type" varchar(20) NOT NULL DEFAULT 'custom';

-- Modify secret to be nullable (only required for custom webhooks)
ALTER TABLE "webhooks" ALTER COLUMN "secret" DROP NOT NULL;
ALTER TABLE "webhooks" ALTER COLUMN "secret" TYPE varchar(64);

-- Add severity filter (JSON array)
ALTER TABLE "webhooks" ADD COLUMN IF NOT EXISTS "severity_filter" text;

-- Add domain filter (FK to domains table)
ALTER TABLE "webhooks" ADD COLUMN IF NOT EXISTS "domain_filter" uuid;

-- Add foreign key constraint for domain filter
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_domain_filter_fkey"
  FOREIGN KEY ("domain_filter") REFERENCES "domains"("id") ON DELETE SET NULL;

-- Change events from jsonb to text (JSON string)
ALTER TABLE "webhooks" ALTER COLUMN "events" TYPE text;

-- Remove default from secret since it's now nullable
ALTER TABLE "webhooks" ALTER COLUMN "secret" DROP DEFAULT;

-- Update failureCount to have default of 0 if not set
ALTER TABLE "webhooks" ALTER COLUMN "failure_count" SET DEFAULT 0;

-- Comments for documentation
COMMENT ON COLUMN "webhooks"."name" IS 'Human-readable name for the webhook';
COMMENT ON COLUMN "webhooks"."type" IS 'Webhook type: slack, discord, teams, or custom';
COMMENT ON COLUMN "webhooks"."secret" IS 'HMAC secret for custom webhooks (nullable)';
COMMENT ON COLUMN "webhooks"."events" IS 'JSON array of event types to subscribe to';
COMMENT ON COLUMN "webhooks"."severity_filter" IS 'JSON array of severities to filter (null = all)';
COMMENT ON COLUMN "webhooks"."domain_filter" IS 'Optional domain ID to filter events (null = all domains)';
