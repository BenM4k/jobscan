import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  numeric,
  boolean,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { timestamps } from "./common";
import { user } from "./auth";

// ─────────────────────────────────────────────────────────────
// AI ops: cost tracking, token audit trail & feature flags
// ─────────────────────────────────────────────────────────────

export const aiFeatureEnum = pgEnum("ai_feature", [
  "scoring",
  "tailored_resume",
  "tailored_cover_letter",
  "interview_prep",
  "explanation",
]);

export const aiCallLog = pgTable(
  "ai_call_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    feature: aiFeatureEnum("feature").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    costEstimateUsd: numeric("cost_estimate_usd"),
    cacheHit: boolean("cache_hit").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("ai_call_log_user_feature_idx").on(t.userId, t.feature),
  ]
);

export const featureFlag = pgTable("feature_flag", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  description: text("description"),
  enabledGlobally: boolean("enabled_globally").default(false).notNull(),
  ...timestamps,
});

export const featureFlagAssignment = pgTable(
  "feature_flag_assignment",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    featureFlagId: uuid("feature_flag_id")
      .references(() => featureFlag.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("feature_flag_assignment_unique_idx").on(
      t.featureFlagId,
      t.userId
    ),
  ]
);

export const idempotencyKey = pgTable(
  "idempotency_key",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: text("key").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    status: varchar("status", { length: 20 }).default("in_progress").notNull(),
    targetId: text("target_id"),
    resultRef: uuid("result_ref"),
    attemptId: uuid("attempt_id").defaultRandom().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("idempotency_key_unique_idx").on(
      t.userId,
      t.action,
      t.key
    ),
  ]
);

export type IdempotencyKeySelect = typeof idempotencyKey.$inferSelect;
export type IdempotencyKeyInsert = typeof idempotencyKey.$inferInsert;
