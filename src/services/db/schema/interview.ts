import {
  pgTable,
  uuid,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { timestamps } from "./common";
import { pipelineEntry } from "./pipeline";

// ─────────────────────────────────────────────────────────────
// Interview prep
// ─────────────────────────────────────────────────────────────

export const interviewQuestionSet = pgTable(
  "interview_question_set",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pipelineEntryId: uuid("pipeline_entry_id")
      .references(() => pipelineEntry.id, { onDelete: "cascade" })
      .notNull(),
    questions: jsonb("questions").notNull(),
    ...timestamps,
  },
  (t) => [
    index("interview_question_set_entry_idx").on(t.pipelineEntryId),
  ]
);

export const mockInterviewSession = pgTable(
  "mock_interview_session",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    interviewQuestionSetId: uuid("interview_question_set_id")
      .references(() => interviewQuestionSet.id, { onDelete: "cascade" })
      .notNull(),
    transcript: jsonb("transcript").notNull(),
    ...timestamps,
  },
  (t) => [
    index("mock_interview_session_set_idx").on(t.interviewQuestionSetId),
  ]
);
