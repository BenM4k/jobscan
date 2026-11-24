CREATE INDEX "job_posted_at_idx" ON "job" USING btree ("posted_at");--> statement-breakpoint
CREATE INDEX "job_source_ref_job_id_idx" ON "job_source_ref" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "pipeline_entry_job_id_idx" ON "pipeline_entry" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "score_pipeline_entry_created_idx" ON "score" USING btree ("pipeline_entry_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_call_log_user_created_idx" ON "ai_call_log" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "feature_flag_assignment_user_idx" ON "feature_flag_assignment" USING btree ("user_id");