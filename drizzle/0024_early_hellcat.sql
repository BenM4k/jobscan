CREATE TABLE "subscription_payment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"status" "credit_purchase_status" DEFAULT 'pending' NOT NULL,
	"provider" text NOT NULL,
	"provider_reference" text,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "subscription_payment" ADD CONSTRAINT "subscription_payment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_payment" ADD CONSTRAINT "subscription_payment_plan_id_subscription_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_payment_user_idempotency_idx" ON "subscription_payment" USING btree ("user_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_payment_provider_ref_idx" ON "subscription_payment" USING btree ("provider_reference");--> statement-breakpoint
CREATE INDEX "subscription_payment_user_status_idx" ON "subscription_payment" USING btree ("user_id","status");