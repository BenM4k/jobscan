-- Migration: enforce user_id NOT NULL on jobs and deleted_jobs
--
-- Step 1: Remove any rows that cannot be associated with a user.
--   These would fail the NOT NULL constraint and cannot be assigned to an
--   owner retroactively. In a production database, review these rows before
--   applying this migration.
DELETE FROM "jobs" WHERE "user_id" IS NULL;--> statement-breakpoint
DELETE FROM "deleted_jobs" WHERE "user_id" IS NULL;--> statement-breakpoint

-- Step 2: Enforce NOT NULL on both columns.
ALTER TABLE "jobs" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "deleted_jobs" ALTER COLUMN "user_id" SET NOT NULL;
