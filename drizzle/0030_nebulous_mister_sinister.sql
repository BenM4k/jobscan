ALTER TYPE "public"."ai_feature" ADD VALUE 'job_extraction' BEFORE 'explanation';--> statement-breakpoint
ALTER TYPE "public"."credit_cost_action" ADD VALUE 'job_extraction';--> statement-breakpoint
ALTER TYPE "public"."credit_ledger_action" ADD VALUE 'job_extraction' BEFORE 'refund';