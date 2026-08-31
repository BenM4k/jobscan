ALTER TABLE "deleted_jobs" DROP CONSTRAINT "uniq_deleted_source_external";--> statement-breakpoint
ALTER TABLE "jobs" DROP CONSTRAINT "uniq_source_external";--> statement-breakpoint
ALTER TABLE "deleted_jobs" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "deleted_jobs" ADD CONSTRAINT "deleted_jobs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deleted_jobs" ADD CONSTRAINT "uniq_deleted_user_source_external" UNIQUE("user_id","source","external_id");--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "uniq_user_source_external" UNIQUE("user_id","source","external_id");