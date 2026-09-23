CREATE TYPE "public"."credit_cost_action" AS ENUM('tailored_resume', 'tailored_cover_letter', 'interview_prep');--> statement-breakpoint
CREATE TYPE "public"."credit_ledger_action" AS ENUM('purchase', 'signup_grant', 'tailored_resume', 'tailored_cover_letter', 'interview_prep', 'refund');--> statement-breakpoint
CREATE TYPE "public"."credit_purchase_status" AS ENUM('pending', 'confirmed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'canceled', 'past_due');--> statement-breakpoint
CREATE TABLE "credit_balance" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_cost" (
	"action" "credit_cost_action" PRIMARY KEY NOT NULL,
	"cost" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"action" "credit_ledger_action" NOT NULL,
	"amount" integer NOT NULL,
	"related_id" uuid,
	"balance_after" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_pack" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"credit_amount" integer NOT NULL,
	"price_cents" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_purchase" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"credit_pack_id" uuid NOT NULL,
	"status" "credit_purchase_status" DEFAULT 'pending' NOT NULL,
	"provider" text NOT NULL,
	"provider_reference" text,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"plan_id" uuid NOT NULL,
	"status" "subscription_status" DEFAULT 'past_due' NOT NULL,
	"current_period_end" timestamp with time zone NOT NULL,
	"provider" text NOT NULL,
	"provider_subscription_id" text,
	"idempotency_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_plan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"price_cents_monthly" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_plan_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "credit_balance" ADD CONSTRAINT "credit_balance_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_purchase" ADD CONSTRAINT "credit_purchase_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_purchase" ADD CONSTRAINT "credit_purchase_credit_pack_id_credit_pack_id_fk" FOREIGN KEY ("credit_pack_id") REFERENCES "public"."credit_pack"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_plan_id_subscription_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credit_ledger_user_created_idx" ON "credit_ledger" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "credit_ledger_action_idx" ON "credit_ledger" USING btree ("action");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_purchase_user_idempotency_idx" ON "credit_purchase" USING btree ("user_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "credit_purchase_provider_ref_idx" ON "credit_purchase" USING btree ("provider_reference");--> statement-breakpoint
CREATE INDEX "credit_purchase_user_status_idx" ON "credit_purchase" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "subscription_status_period_idx" ON "subscription" USING btree ("status","current_period_end");--> statement-breakpoint
CREATE INDEX "subscription_user_idempotency_idx" ON "subscription" USING btree ("user_id","idempotency_key");