import {
  pgTable,
  uuid,
  text,
  varchar,
  numeric,
  timestamp,
  jsonb,
  pgEnum,
  vector,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { timestamps } from "./common";
import { user } from "./auth";

// ─────────────────────────────────────────────────────────────
// PHASE 0 & 2 — Ingestion hygiene & Normalized Job Catalog
// ─────────────────────────────────────────────────────────────

export const jobSourceEnum = pgEnum("job_source", [
  "ashby",
  "greenhouse",
  "remoteok",
  "lever",
  "congojob",
  "emploi_cd",
  "fecrdc",
  "unjobs",
  "reliefweb",
  "manual",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "active",
  "likely_stale",
  "closed",
]);

/** Normalized job — canonical shape every source adapter maps into. */
export const job = pgTable(
  "job",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    source: jobSourceEnum("source").notNull(),
    externalId: text("external_id"), // null for manually-added jobs
    title: text("title").notNull(),
    company: text("company").notNull(),
    location: text("location"),
    description: text("description").notNull(),
    url: text("url"),
    postedAt: timestamp("posted_at"),
    status: jobStatusEnum("status").default("active").notNull(),

    // --- Salary normalization ---
    salaryMin: numeric("salary_min"),
    salaryMax: numeric("salary_max"),
    salaryCurrency: varchar("salary_currency", { length: 3 }),
    salaryPeriod: varchar("salary_period", { length: 20 }),
    salaryNormalizedYearlyUsd: numeric("salary_normalized_yearly_usd"),
    rawSalaryText: text("raw_salary_text"),

    // --- Matching (pgvector & SimHash) ---
    embedding: vector("embedding", { dimensions: 1536 }),
    simhash: numeric("simhash"),

    addedByUserId: uuid("added_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("job_source_external_id_idx").on(t.source, t.externalId),
    index("job_embedding_hnsw_idx").using(
      "hnsw",
      t.embedding.op("vector_cosine_ops")
    ),
    index("job_simhash_idx").on(t.simhash),
  ]
);

/** Untouched payload from each adapter fetch — never mutated after insert. */
export const rawJobPayload = pgTable(
  "raw_job_payload",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    source: jobSourceEnum("source").notNull(),
    externalId: text("external_id").notNull(),
    payload: jsonb("payload").notNull(),
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
    normalizedJobId: uuid("normalized_job_id").references(() => job.id),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("raw_job_source_external_id_idx").on(t.source, t.externalId),
  ]
);

/**
 * Cross-source dedup: links newly-seen source postings to canonical `job` row.
 */
export const jobSourceRef = pgTable(
  "job_source_ref",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobId: uuid("job_id")
      .references(() => job.id)
      .notNull(),
    source: jobSourceEnum("source").notNull(),
    externalId: text("external_id").notNull(),
    url: text("url"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("job_source_ref_unique_idx").on(t.source, t.externalId),
  ]
);
