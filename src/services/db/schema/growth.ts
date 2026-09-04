import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { timestamps } from "./common";
import { user } from "./auth";

// ─────────────────────────────────────────────────────────────
// Growth: User preferences & digest email logs
// ─────────────────────────────────────────────────────────────

export const userPreference = pgTable("user_preference", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" })
    .unique(),
  locale: varchar("locale", { length: 10 }).default("en").notNull(),
  digestEmailEnabled: boolean("digest_email_enabled").default(true).notNull(),
  digestEmailFrequency: varchar("digest_email_frequency", { length: 20 })
    .default("weekly")
    .notNull(),
  ...timestamps,
});

export const digestEmailLog = pgTable(
  "digest_email_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    sentAt: timestamp("sent_at").defaultNow().notNull(),
    jobIdsIncluded: jsonb("job_ids_included").notNull(),
  },
  (t) => [
    index("digest_email_log_user_idx").on(t.userId),
  ]
);
