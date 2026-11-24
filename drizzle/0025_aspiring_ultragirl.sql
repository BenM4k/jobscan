WITH ranked_resumes AS (
  SELECT
    id,
    FIRST_VALUE(id) OVER (
      PARTITION BY pipeline_entry_id
      ORDER BY updated_at DESC, created_at DESC, id DESC
    ) AS survivor_id,
    ROW_NUMBER() OVER (
      PARTITION BY pipeline_entry_id
      ORDER BY updated_at DESC, created_at DESC, id DESC
    ) AS rn
  FROM "tailored_resume"
),
reconcile_resume_versions AS (
  UPDATE "tailored_resume_version" trv
  SET "tailored_resume_id" = rr.survivor_id
  FROM ranked_resumes rr
  WHERE trv."tailored_resume_id" = rr.id
    AND rr.rn > 1
),
reconcile_promoted_resumes AS (
  UPDATE "master_resume" mr
  SET "promoted_from_tailored_resume_id" = rr.survivor_id
  FROM ranked_resumes rr
  WHERE mr."promoted_from_tailored_resume_id" = rr.id
    AND rr.rn > 1
)
DELETE FROM "tailored_resume" tr
USING ranked_resumes rr
WHERE tr.id = rr.id
  AND rr.rn > 1;--> statement-breakpoint
WITH ranked_letters AS (
  SELECT
    id,
    FIRST_VALUE(id) OVER (
      PARTITION BY pipeline_entry_id
      ORDER BY updated_at DESC, created_at DESC, id DESC
    ) AS survivor_id,
    ROW_NUMBER() OVER (
      PARTITION BY pipeline_entry_id
      ORDER BY updated_at DESC, created_at DESC, id DESC
    ) AS rn
  FROM "tailored_cover_letter"
),
reconcile_letter_versions AS (
  UPDATE "cover_letter_version" clv
  SET "tailored_cover_letter_id" = rl.survivor_id
  FROM ranked_letters rl
  WHERE clv."tailored_cover_letter_id" = rl.id
    AND rl.rn > 1
)
DELETE FROM "tailored_cover_letter" tcl
USING ranked_letters rl
WHERE tcl.id = rl.id
  AND rl.rn > 1;--> statement-breakpoint
DROP INDEX IF EXISTS "tailored_cover_letter_pipeline_entry_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "tailored_resume_pipeline_entry_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "tailored_cover_letter_pipeline_entry_idx" ON "tailored_cover_letter" USING btree ("pipeline_entry_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tailored_resume_pipeline_entry_idx" ON "tailored_resume" USING btree ("pipeline_entry_id");