ALTER TABLE "profile" ALTER COLUMN "ai_provider" SET DEFAULT 'gemini';--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "country" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "country_code" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "city" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "workplace_type" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "remote_regions" jsonb;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "matched_skills" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "missing_skills" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "gaps" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "tailored_resume_data" jsonb;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "raw_text" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "summary" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "education" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "experience" jsonb DEFAULT '[]'::jsonb;