import {
  pgTable,
  uuid,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { timestamps } from "./common";
import { user } from "./auth";
import { job } from "./job";
import { masterResume } from "./resume";

// ─────────────────────────────────────────────────────────────
// Pipeline & funnel analytics
// ─────────────────────────────────────────────────────────────

export const pipelineStatusEnum = pgEnum("pipeline_status", [
  "saved",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn",
]);

export const pipelineEntry = pgTable(
  "pipeline_entry",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .references(() => job.id, { onDelete: "cascade" })
      .notNull(),
    status: pipelineStatusEnum("status").default("saved").notNull(),
    resumeIdUsed: uuid("resume_id_used").references(() => masterResume.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("pipeline_entry_user_job_idx").on(t.userId, t.jobId),
    index("pipeline_entry_user_idx").on(t.userId),
  ]
);

/** Timestamped status changes — funnel analytics data source. */
export const pipelineStatusHistory = pgTable(
  "pipeline_status_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pipelineEntryId: uuid("pipeline_entry_id")
      .references(() => pipelineEntry.id, { onDelete: "cascade" })
      .notNull(),
    status: pipelineStatusEnum("status").notNull(),
    changedAt: timestamp("changed_at").defaultNow().notNull(),
  },
  (t) => [
    index("pipeline_status_history_entry_idx").on(t.pipelineEntryId),
  ]
);

// ─────────────────────────────────────────────────────────────
// Compat type aliases — previously exported from legacy.ts
// ─────────────────────────────────────────────────────────────

export type PipelineStatus = (typeof pipelineStatusEnum.enumValues)[number];

/** Legacy status values still used in the UI status filter dropdown. */
export const legacyJobStatusEnum = [
  "new",
  "saved",
  "scored",
  "tailored",
  "applied",
  "interviewing",
  "rejected",
  "offer",
] as const;

export type LegacyJobStatus = (typeof legacyJobStatusEnum)[number];

/** Union of legacy + pipeline statuses — narrow to PipelineStatus when UI is updated. */
export type JobStatus = LegacyJobStatus | PipelineStatus;
