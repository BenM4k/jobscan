import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  vector,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { timestamps } from "./common";
import { user } from "./auth";
import { skill } from "./skills";

// ─────────────────────────────────────────────────────────────
// Resume — Multi-persona support
// ─────────────────────────────────────────────────────────────

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
    embedding: vector("embedding", { dimensions: 1536 }),
    ...timestamps,
  },
  (t) => [
    index("master_resume_user_idx").on(t.userId),
  ]
);

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
