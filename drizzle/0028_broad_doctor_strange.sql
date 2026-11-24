ALTER TYPE "public"."credit_ledger_action" ADD VALUE 'admin_grant';--> statement-breakpoint
CREATE TABLE "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" uuid,
	"target_user_id" uuid,
	"action" text NOT NULL,
	"reason" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_admin_user_id_user_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_target_user_id_user_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_log_created_idx" ON "admin_audit_log" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "admin_audit_log_target_idx" ON "admin_audit_log" USING btree ("target_user_id","created_at" DESC NULLS LAST);