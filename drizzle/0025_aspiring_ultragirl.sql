DROP INDEX "tailored_cover_letter_pipeline_entry_idx";--> statement-breakpoint
DROP INDEX "tailored_resume_pipeline_entry_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "tailored_cover_letter_pipeline_entry_idx" ON "tailored_cover_letter" USING btree ("pipeline_entry_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tailored_resume_pipeline_entry_idx" ON "tailored_resume" USING btree ("pipeline_entry_id");