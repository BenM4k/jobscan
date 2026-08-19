ALTER TABLE "deleted_jobs" DROP CONSTRAINT "deleted_jobs_source_external_id_unique";--> statement-breakpoint
ALTER TABLE "jobs" DROP CONSTRAINT "jobs_source_external_id_unique";--> statement-breakpoint
ALTER TABLE "deleted_jobs" ADD CONSTRAINT "uniq_deleted_source_external" UNIQUE("source","external_id");--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "uniq_source_external" UNIQUE("source","external_id");