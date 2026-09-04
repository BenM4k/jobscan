import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { timestamps } from "./common";
import { pipelineEntry } from "./pipeline";

// ─────────────────────────────────────────────────────────────
// Scoring Snapshots
// ─────────────────────────────────────────────────────────────

export const score = pgTable(
  "score",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pipelineEntryId: uuid("pipeline_entry_id")
      .references(() => pipelineEntry.id, { onDelete: "cascade" })
      .notNull(),
    resumeVersion: integer("resume_version").notNull(),
    modelUsed: text("model_used").notNull(),
    cosineSimilarity: numeric("cosine_similarity"),
    bm25Rank: numeric("bm25_rank"),
    finalScore: numeric("final_score").notNull(),
    matchedSkills: jsonb("matched_skills").$type<string[]>(),
    missingSkills: jsonb("missing_skills").$type<string[]>(),
    explanation: text("explanation"),
    ...timestamps,
  },
  (t) => [
    index("score_pipeline_entry_idx").on(t.pipelineEntryId),
  ]
);
