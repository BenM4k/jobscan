import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { timestamps } from "./common";
import { pipelineEntry } from "./pipeline";

// ─────────────────────────────────────────────────────────────
// Tailored documents + version history
// ─────────────────────────────────────────────────────────────

export const tailoredResume = pgTable(
  "tailored_resume",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pipelineEntryId: uuid("pipeline_entry_id")
      .references(() => pipelineEntry.id, { onDelete: "cascade" })
      .notNull(),
    content: text("content").notNull(),
    strategyLabel: text("strategy_label"),
    ...timestamps,
  },
  (t) => [
    index("tailored_resume_pipeline_entry_idx").on(t.pipelineEntryId),
  ]
);

export const tailoredResumeVersion = pgTable(
  "tailored_resume_version",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tailoredResumeId: uuid("tailored_resume_id")
      .references(() => tailoredResume.id, { onDelete: "cascade" })
      .notNull(),
    content: text("content").notNull(),
    diffFromPrevious: jsonb("diff_from_previous"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("tailored_resume_version_resume_idx").on(t.tailoredResumeId),
  ]
);

export const tailoredCoverLetter = pgTable(
  "tailored_cover_letter",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pipelineEntryId: uuid("pipeline_entry_id")
      .references(() => pipelineEntry.id, { onDelete: "cascade" })
      .notNull(),
    content: text("content").notNull(),
    ...timestamps,
  },
  (t) => [
    index("tailored_cover_letter_pipeline_entry_idx").on(t.pipelineEntryId),
  ]
);

export const coverLetterVersion = pgTable(
  "cover_letter_version",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tailoredCoverLetterId: uuid("tailored_cover_letter_id")
      .references(() => tailoredCoverLetter.id, { onDelete: "cascade" })
      .notNull(),
    content: text("content").notNull(),
    diffFromPrevious: jsonb("diff_from_previous"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("cover_letter_version_letter_idx").on(t.tailoredCoverLetterId),
  ]
);
