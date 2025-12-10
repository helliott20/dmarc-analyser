-- Add pass_count, fail_count, and updated_at columns to subdomains table
ALTER TABLE "subdomains" ADD COLUMN "pass_count" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "subdomains" ADD COLUMN "fail_count" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "subdomains" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;
