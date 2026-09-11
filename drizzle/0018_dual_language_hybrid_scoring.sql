DO $$ BEGIN
  CREATE TYPE "public"."job_language" AS ENUM('en', 'fr');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN IF NOT EXISTS "language" "job_language" DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "master_resume" ADD COLUMN IF NOT EXISTS "language" "job_language" DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "job" DROP COLUMN IF EXISTS "description_tsv";--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "description_tsv" tsvector
  GENERATED ALWAYS AS (
    CASE WHEN "language" = 'fr'
      THEN to_tsvector('french'::regconfig, "description")
      ELSE to_tsvector('english'::regconfig, "description")
    END
  ) STORED;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_description_tsv_idx" ON "job" USING gin ("description_tsv");
