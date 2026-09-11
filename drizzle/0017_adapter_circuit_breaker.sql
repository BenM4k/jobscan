CREATE TYPE "public"."circuit_breaker_state" AS ENUM('closed', 'open', 'half_open');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "adapter_circuit_breaker" (
	"source" text PRIMARY KEY NOT NULL,
	"state" "circuit_breaker_state" DEFAULT 'closed' NOT NULL,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"consecutive_opens" integer DEFAULT 0 NOT NULL,
	"opened_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
