DO $$ BEGIN
  CREATE TYPE "public"."master_resume_source" AS ENUM('uploaded', 'promoted_tailored');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

ALTER TABLE "master_resume" ADD COLUMN IF NOT EXISTS "source" "master_resume_source" DEFAULT 'uploaded' NOT NULL;--> statement-breakpoint
ALTER TABLE "master_resume" ADD COLUMN IF NOT EXISTS "promoted_from_tailored_resume_id" uuid;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "master_resume" ADD CONSTRAINT "master_resume_promoted_from_tailored_resume_id_tailored_resume_id_fk" FOREIGN KEY ("promoted_from_tailored_resume_id") REFERENCES "public"."tailored_resume"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

ALTER TABLE "tailored_resume" ADD COLUMN IF NOT EXISTS "language" "job_language" DEFAULT 'en' NOT NULL;
