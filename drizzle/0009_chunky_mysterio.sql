CREATE TYPE "public"."job_source" AS ENUM('ashby', 'greenhouse', 'remoteok', 'lever', 'congojob', 'emploi_cd', 'fecrdc', 'unjobs', 'reliefweb', 'manual');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('active', 'likely_stale', 'closed');--> statement-breakpoint
CREATE TYPE "public"."skill_relation_type" AS ENUM('implies', 'broader_than');--> statement-breakpoint
CREATE TYPE "public"."pipeline_status" AS ENUM('saved', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."ai_feature" AS ENUM('scoring', 'tailored_resume', 'tailored_cover_letter', 'interview_prep', 'explanation');--> statement-breakpoint
CREATE TABLE "job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "job_source" NOT NULL,
	"external_id" text,
	"title" text NOT NULL,
	"company" text NOT NULL,
	"location" text,
	"description" text NOT NULL,
	"url" text,
	"posted_at" timestamp,
	"status" "job_status" DEFAULT 'active' NOT NULL,
	"salary_min" numeric,
	"salary_max" numeric,
	"salary_currency" varchar(3),
	"salary_period" varchar(20),
	"salary_normalized_yearly_usd" numeric,
	"raw_salary_text" text,
	"embedding" vector(1536),
	"simhash" numeric,
	"added_by_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_source_ref" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"source" "job_source" NOT NULL,
	"external_id" text NOT NULL,
	"url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_job_payload" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "job_source" NOT NULL,
	"external_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	"normalized_job_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_skill" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "skill_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "skill_relation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_skill_id" uuid NOT NULL,
	"to_skill_id" uuid NOT NULL,
	"relation_type" "skill_relation_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "master_resume" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text DEFAULT 'Default' NOT NULL,
	"content" text NOT NULL,
	"file_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"embedding" vector(1536),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resume_skill" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resume_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"status" "pipeline_status" DEFAULT 'saved' NOT NULL,
	"resume_id_used" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipeline_entry_id" uuid NOT NULL,
	"status" "pipeline_status" NOT NULL,
	"changed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "score" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipeline_entry_id" uuid NOT NULL,
	"resume_version" integer NOT NULL,
	"model_used" text NOT NULL,
	"cosine_similarity" numeric,
	"bm25_rank" numeric,
	"final_score" numeric NOT NULL,
	"matched_skills" jsonb,
	"missing_skills" jsonb,
	"explanation" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cover_letter_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tailored_cover_letter_id" uuid NOT NULL,
	"content" text NOT NULL,
	"diff_from_previous" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tailored_cover_letter" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipeline_entry_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tailored_resume" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipeline_entry_id" uuid NOT NULL,
	"content" text NOT NULL,
	"strategy_label" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tailored_resume_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tailored_resume_id" uuid NOT NULL,
	"content" text NOT NULL,
	"diff_from_previous" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interview_question_set" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipeline_entry_id" uuid NOT NULL,
	"questions" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mock_interview_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interview_question_set_id" uuid NOT NULL,
	"transcript" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_call_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"feature" "ai_feature" NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"cost_estimate_usd" numeric,
	"cache_hit" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_flag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"description" text,
	"enabled_globally" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "feature_flag_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "feature_flag_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feature_flag_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"enabled" boolean NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "digest_email_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"job_ids_included" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preference" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"locale" varchar(10) DEFAULT 'en' NOT NULL,
	"digest_email_enabled" boolean DEFAULT true NOT NULL,
	"digest_email_frequency" varchar(20) DEFAULT 'weekly' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_preference_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "job_source_ref" ADD CONSTRAINT "job_source_ref_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_job_payload" ADD CONSTRAINT "raw_job_payload_normalized_job_id_job_id_fk" FOREIGN KEY ("normalized_job_id") REFERENCES "public"."job"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_skill" ADD CONSTRAINT "job_skill_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_skill" ADD CONSTRAINT "job_skill_skill_id_skill_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skill"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_relation" ADD CONSTRAINT "skill_relation_from_skill_id_skill_id_fk" FOREIGN KEY ("from_skill_id") REFERENCES "public"."skill"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_relation" ADD CONSTRAINT "skill_relation_to_skill_id_skill_id_fk" FOREIGN KEY ("to_skill_id") REFERENCES "public"."skill"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_resume" ADD CONSTRAINT "master_resume_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_skill" ADD CONSTRAINT "resume_skill_resume_id_master_resume_id_fk" FOREIGN KEY ("resume_id") REFERENCES "public"."master_resume"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_skill" ADD CONSTRAINT "resume_skill_skill_id_skill_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skill"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_entry" ADD CONSTRAINT "pipeline_entry_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_entry" ADD CONSTRAINT "pipeline_entry_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_entry" ADD CONSTRAINT "pipeline_entry_resume_id_used_master_resume_id_fk" FOREIGN KEY ("resume_id_used") REFERENCES "public"."master_resume"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_status_history" ADD CONSTRAINT "pipeline_status_history_pipeline_entry_id_pipeline_entry_id_fk" FOREIGN KEY ("pipeline_entry_id") REFERENCES "public"."pipeline_entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score" ADD CONSTRAINT "score_pipeline_entry_id_pipeline_entry_id_fk" FOREIGN KEY ("pipeline_entry_id") REFERENCES "public"."pipeline_entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cover_letter_version" ADD CONSTRAINT "cover_letter_version_tailored_cover_letter_id_tailored_cover_letter_id_fk" FOREIGN KEY ("tailored_cover_letter_id") REFERENCES "public"."tailored_cover_letter"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tailored_cover_letter" ADD CONSTRAINT "tailored_cover_letter_pipeline_entry_id_pipeline_entry_id_fk" FOREIGN KEY ("pipeline_entry_id") REFERENCES "public"."pipeline_entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tailored_resume" ADD CONSTRAINT "tailored_resume_pipeline_entry_id_pipeline_entry_id_fk" FOREIGN KEY ("pipeline_entry_id") REFERENCES "public"."pipeline_entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tailored_resume_version" ADD CONSTRAINT "tailored_resume_version_tailored_resume_id_tailored_resume_id_fk" FOREIGN KEY ("tailored_resume_id") REFERENCES "public"."tailored_resume"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_question_set" ADD CONSTRAINT "interview_question_set_pipeline_entry_id_pipeline_entry_id_fk" FOREIGN KEY ("pipeline_entry_id") REFERENCES "public"."pipeline_entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_interview_session" ADD CONSTRAINT "mock_interview_session_interview_question_set_id_interview_question_set_id_fk" FOREIGN KEY ("interview_question_set_id") REFERENCES "public"."interview_question_set"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_call_log" ADD CONSTRAINT "ai_call_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_flag_assignment" ADD CONSTRAINT "feature_flag_assignment_feature_flag_id_feature_flag_id_fk" FOREIGN KEY ("feature_flag_id") REFERENCES "public"."feature_flag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_flag_assignment" ADD CONSTRAINT "feature_flag_assignment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digest_email_log" ADD CONSTRAINT "digest_email_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preference" ADD CONSTRAINT "user_preference_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "job_source_external_id_idx" ON "job" USING btree ("source","external_id");--> statement-breakpoint
CREATE INDEX "job_embedding_hnsw_idx" ON "job" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "job_simhash_idx" ON "job" USING btree ("simhash");--> statement-breakpoint
CREATE UNIQUE INDEX "job_source_ref_unique_idx" ON "job_source_ref" USING btree ("source","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "raw_job_source_external_id_idx" ON "raw_job_payload" USING btree ("source","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "job_skill_unique_idx" ON "job_skill" USING btree ("job_id","skill_id");--> statement-breakpoint
CREATE UNIQUE INDEX "skill_relation_edge_idx" ON "skill_relation" USING btree ("from_skill_id","to_skill_id","relation_type");--> statement-breakpoint
CREATE INDEX "master_resume_user_idx" ON "master_resume" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "resume_skill_unique_idx" ON "resume_skill" USING btree ("resume_id","skill_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pipeline_entry_user_job_idx" ON "pipeline_entry" USING btree ("user_id","job_id");--> statement-breakpoint
CREATE INDEX "pipeline_entry_user_idx" ON "pipeline_entry" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pipeline_status_history_entry_idx" ON "pipeline_status_history" USING btree ("pipeline_entry_id");--> statement-breakpoint
CREATE INDEX "score_pipeline_entry_idx" ON "score" USING btree ("pipeline_entry_id");--> statement-breakpoint
CREATE INDEX "cover_letter_version_letter_idx" ON "cover_letter_version" USING btree ("tailored_cover_letter_id");--> statement-breakpoint
CREATE INDEX "tailored_cover_letter_pipeline_entry_idx" ON "tailored_cover_letter" USING btree ("pipeline_entry_id");--> statement-breakpoint
CREATE INDEX "tailored_resume_pipeline_entry_idx" ON "tailored_resume" USING btree ("pipeline_entry_id");--> statement-breakpoint
CREATE INDEX "tailored_resume_version_resume_idx" ON "tailored_resume_version" USING btree ("tailored_resume_id");--> statement-breakpoint
CREATE INDEX "interview_question_set_entry_idx" ON "interview_question_set" USING btree ("pipeline_entry_id");--> statement-breakpoint
CREATE INDEX "mock_interview_session_set_idx" ON "mock_interview_session" USING btree ("interview_question_set_id");--> statement-breakpoint
CREATE INDEX "ai_call_log_user_feature_idx" ON "ai_call_log" USING btree ("user_id","feature");--> statement-breakpoint
CREATE UNIQUE INDEX "feature_flag_assignment_unique_idx" ON "feature_flag_assignment" USING btree ("feature_flag_id","user_id");--> statement-breakpoint
CREATE INDEX "digest_email_log_user_idx" ON "digest_email_log" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN IF NOT EXISTS "description_tsv" tsvector
  GENERATED ALWAYS AS (to_tsvector('english', "description")) STORED;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_description_tsv_idx" ON "job" USING GIN ("description_tsv");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "skill_name_trgm_idx" ON "skill" USING GIN ("name" gin_trgm_ops);