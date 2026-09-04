import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  uuid,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import type { EducationItem, ExperienceItem, TailoredResumeData } from "@/lib/ai";

// ─────────────────────────────────────────────────────────────
// Legacy tables — retained during migration until DAL & UI refactor
// ─────────────────────────────────────────────────────────────

import { legacyJobStatusEnum, type JobStatus, type LegacyJobStatus } from "./pipeline";
export { legacyJobStatusEnum, type JobStatus, type LegacyJobStatus };

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    externalId: text("external_id").notNull(),
    title: text("title").notNull(),
    company: text("company").notNull(),
    url: text("url").notNull(),
    description: text("description"),
    postedAt: timestamp("posted_at"),
    country: text("country"),
    countryCode: text("country_code"),
    city: text("city"),
    workplaceType: text("workplace_type"),
    remoteRegions: jsonb("remote_regions").$type<string[]>(),
    fitScore: integer("fit_score"),
    scoreReasoning: text("score_reasoning"),
    matchedSkills: jsonb("matched_skills").$type<string[]>().default([]),
    missingSkills: jsonb("missing_skills").$type<string[]>().default([]),
    gaps: jsonb("gaps").$type<string[]>().default([]),
    coverLetterDraft: text("cover_letter_draft"),
    tailoredResume: text("tailored_resume"),
    tailoredResumeData: jsonb("tailored_resume_data").$type<TailoredResumeData>(),
    status: text("status", { enum: legacyJobStatusEnum })
      .default("new")
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique("uniq_user_source_external").on(table.userId, table.source, table.externalId),
    index("jobs_user_id_idx").on(table.userId),
    index("jobs_user_status_idx").on(table.userId, table.status),
    index("jobs_user_posted_at_idx").on(table.userId, table.postedAt),
    index("jobs_user_created_at_idx").on(table.userId, table.createdAt),
    index("jobs_user_source_idx").on(table.userId, table.source),
    index("jobs_user_fit_score_idx").on(table.userId, table.fitScore),
  ]
);

export const profile = pgTable("profile", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => user.id, { onDelete: "cascade" })
    .unique(),
  resumeText: text("resume_text").notNull(),
  rawText: text("raw_text"),
  summary: text("summary"),
  skills: jsonb("skills").$type<string[]>().default([]),
  education: jsonb("education").$type<EducationItem[]>().default([]),
  experience: jsonb("experience").$type<ExperienceItem[]>().default([]),
  aiProvider: text("ai_provider").default("gemini").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const deletedJobs = pgTable(
  "deleted_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    externalId: text("external_id").notNull(),
    deletedAt: timestamp("deleted_at").defaultNow().notNull(),
  },
  (table) => [
    unique("uniq_deleted_user_source_external").on(table.userId, table.source, table.externalId),
    index("deleted_jobs_user_id_idx").on(table.userId),
  ]
);
