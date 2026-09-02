CREATE INDEX IF NOT EXISTS "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "deleted_jobs_user_id_idx" ON "deleted_jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_user_id_idx" ON "jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_user_status_idx" ON "jobs" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_user_posted_at_idx" ON "jobs" USING btree ("user_id","posted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_user_created_at_idx" ON "jobs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_user_source_idx" ON "jobs" USING btree ("user_id","source");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_user_fit_score_idx" ON "jobs" USING btree ("user_id","fit_score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" USING btree ("identifier");
