import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  vector,
  index,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { timestamps } from "./common";
import { user } from "./auth";
import { skill } from "./skills";
import { jobLanguageEnum } from "./job";
import { tailoredResume } from "./tailoring";

// ─────────────────────────────────────────────────────────────
// Resume — Multi-persona support
// ─────────────────────────────────────────────────────────────

export const masterResumeSourceEnum = pgEnum("master_resume_source", [
  "uploaded",
  "promoted_tailored",
]);

export const masterResume = pgTable(
  "master_resume",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    label: text("label").notNull().default("Default"),
    content: text("content").notNull(),
    fileUrl: text("file_url"),
    isActive: boolean("is_active").default(true).notNull(),
    version: integer("version").default(1).notNull(),
    language: jobLanguageEnum("language").default("en").notNull(),
    source: masterResumeSourceEnum("source").default("uploaded").notNull(),
    promotedFromTailoredResumeId: uuid("promoted_from_tailored_resume_id").references(
      (): AnyPgColumn => tailoredResume.id,
      { onDelete: "set null" }
    ),
    embedding: vector("embedding", { dimensions: 1536 }),
    ...timestamps,
  },
  (t) => [
    index("master_resume_user_idx").on(t.userId),
  ]
);

export type MasterResumeSelect = typeof masterResume.$inferSelect;
export type MasterResumeInsert = typeof masterResume.$inferInsert;

export const resumeSkill = pgTable(
  "resume_skill",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    resumeId: uuid("resume_id")
      .references(() => masterResume.id, { onDelete: "cascade" })
      .notNull(),
    skillId: uuid("skill_id")
      .references(() => skill.id, { onDelete: "cascade" })
      .notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("resume_skill_unique_idx").on(t.resumeId, t.skillId),
  ]
);
