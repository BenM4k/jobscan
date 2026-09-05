CREATE TABLE "idempotency_key" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"status" varchar(20) DEFAULT 'in_progress' NOT NULL,
	"target_id" text,
	"result_ref" uuid,
	"attempt_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "idempotency_key" ADD CONSTRAINT "idempotency_key_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_key_unique_idx" ON "idempotency_key" USING btree ("user_id","action","key");