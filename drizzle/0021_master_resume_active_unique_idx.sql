CREATE UNIQUE INDEX IF NOT EXISTS "master_resume_user_active_unique_idx" ON "master_resume" USING btree ("user_id") WHERE ("is_active" = true);
