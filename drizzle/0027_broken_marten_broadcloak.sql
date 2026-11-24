DROP INDEX "job_posted_at_idx";--> statement-breakpoint
DROP INDEX "score_pipeline_entry_created_idx";--> statement-breakpoint
CREATE INDEX "job_posted_at_idx" ON "job" USING btree ("posted_at" DESC NULLS LAST,"created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "score_pipeline_entry_created_idx" ON "score" USING btree ("pipeline_entry_id","created_at" DESC NULLS LAST);