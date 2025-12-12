ALTER TABLE "known_senders" ADD COLUMN "spf_include" varchar(255);--> statement-breakpoint
ALTER TABLE "known_senders" ADD COLUMN "spf_resolved_at" timestamp;