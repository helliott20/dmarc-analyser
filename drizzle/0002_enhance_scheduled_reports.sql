-- Enhance scheduled_reports table with additional fields for better scheduling and content control

-- Add new columns if they don't exist
ALTER TABLE "scheduled_reports" ADD COLUMN IF NOT EXISTS "day_of_week" integer;
ALTER TABLE "scheduled_reports" ADD COLUMN IF NOT EXISTS "day_of_month" integer;
ALTER TABLE "scheduled_reports" ADD COLUMN IF NOT EXISTS "hour" integer DEFAULT 9 NOT NULL;
ALTER TABLE "scheduled_reports" ADD COLUMN IF NOT EXISTS "timezone" varchar(50) DEFAULT 'UTC';
ALTER TABLE "scheduled_reports" ADD COLUMN IF NOT EXISTS "include_charts" boolean DEFAULT true;
ALTER TABLE "scheduled_reports" ADD COLUMN IF NOT EXISTS "include_sources" boolean DEFAULT true;
ALTER TABLE "scheduled_reports" ADD COLUMN IF NOT EXISTS "include_failures" boolean DEFAULT true;
ALTER TABLE "scheduled_reports" ADD COLUMN IF NOT EXISTS "last_sent_at" timestamp;

-- Modify name column length if needed (from 100 to 255)
ALTER TABLE "scheduled_reports" ALTER COLUMN "name" TYPE varchar(255);

-- Modify recipients column type from jsonb to text (for storing JSON as text)
-- Note: If the column already exists as jsonb, this will convert it
DO $$
BEGIN
    -- Check if column exists and is jsonb type
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'scheduled_reports'
        AND column_name = 'recipients'
        AND data_type = 'jsonb'
    ) THEN
        -- Convert jsonb to text
        ALTER TABLE "scheduled_reports" ALTER COLUMN "recipients" TYPE text USING recipients::text;
    END IF;
END $$;

-- Update existing rows to have default values for new columns
UPDATE "scheduled_reports"
SET
    "hour" = COALESCE("hour", 9),
    "timezone" = COALESCE("timezone", 'UTC'),
    "include_charts" = COALESCE("include_charts", true),
    "include_sources" = COALESCE("include_sources", true),
    "include_failures" = COALESCE("include_failures", true)
WHERE "hour" IS NULL
   OR "timezone" IS NULL
   OR "include_charts" IS NULL
   OR "include_sources" IS NULL
   OR "include_failures" IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN "scheduled_reports"."day_of_week" IS '0-6 for weekly reports (0 = Sunday)';
COMMENT ON COLUMN "scheduled_reports"."day_of_month" IS '1-31 for monthly reports';
COMMENT ON COLUMN "scheduled_reports"."hour" IS 'Hour to send report (0-23)';
COMMENT ON COLUMN "scheduled_reports"."timezone" IS 'Timezone for scheduling (e.g., UTC, America/New_York)';
COMMENT ON COLUMN "scheduled_reports"."recipients" IS 'JSON array of email addresses';
COMMENT ON COLUMN "scheduled_reports"."include_charts" IS 'Whether to include charts and visualizations in the report';
COMMENT ON COLUMN "scheduled_reports"."include_sources" IS 'Whether to include top email sources in the report';
COMMENT ON COLUMN "scheduled_reports"."include_failures" IS 'Whether to include authentication failures in the report';
