-- Add feedback_type enum
DO $$ BEGIN
  CREATE TYPE "feedback_type" AS ENUM (
    'auth-failure',
    'fraud',
    'abuse',
    'not-spam',
    'virus',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to forensic_reports table
ALTER TABLE "forensic_reports"
  ADD COLUMN IF NOT EXISTS "report_id" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "reporter_org_name" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL;

-- Update feedback_type column to use enum (if needed)
-- Note: This might require data migration depending on existing data
-- ALTER TABLE "forensic_reports"
--   ALTER COLUMN "feedback_type" TYPE "feedback_type"
--   USING "feedback_type"::"feedback_type";

-- Update auth_results column to jsonb (if not already)
-- ALTER TABLE "forensic_reports"
--   ALTER COLUMN "auth_results" TYPE JSONB
--   USING "auth_results"::JSONB;

-- Add new indexes
CREATE INDEX IF NOT EXISTS "forensic_reports_source_ip_idx" ON "forensic_reports" ("source_ip");
CREATE INDEX IF NOT EXISTS "forensic_reports_feedback_type_idx" ON "forensic_reports" ("feedback_type");

-- Update existing indexes if they don't exist
CREATE INDEX IF NOT EXISTS "forensic_reports_domain_idx" ON "forensic_reports" ("domain_id");
CREATE INDEX IF NOT EXISTS "forensic_reports_arrival_idx" ON "forensic_reports" ("arrival_date");
