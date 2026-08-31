import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  uuid,
  unique,
  index,
} from "drizzle-orm/pg-core";
import type { EducationItem, ExperienceItem, TailoredResumeData } from "@/lib/ai";

// ---------------------------------------------------------------------------
// 1. better-auth Required Tables (UUID enforced)
// ---------------------------------------------------------------------------
export const user = pgTable("user", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const session = pgTable(
  "session",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("session_user_id_idx").on(table.userId),
  ]
);

export const account = pgTable(
  "account",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    issuer: text("issuer"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
  ]
);

export const verification = pgTable(
  "verification",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("verification_identifier_idx").on(table.identifier),
  ]
);


// ---------------------------------------------------------------------------
// 2. JobPilot App Tables
// ---------------------------------------------------------------------------
export const jobStatusEnum = [
  "new",
  "saved",
  "scored",
  "tailored",
  "applied",
  "interviewing",
  "rejected",
  "offer",
] as const;

export type JobStatus = (typeof jobStatusEnum)[number];

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    source: text("source").notNull(), // 'greenhouse' | 'remoteok' | 'lever' | 'ashby' | 'manual'
    externalId: text("external_id").notNull(),
    title: text("title").notNull(),
    company: text("company").notNull(),
    url: text("url").notNull(),
    description: text("description"),
    postedAt: timestamp("posted_at"),
    country: text("country"),
    countryCode: text("country_code"),
    city: text("city"),
    workplaceType: text("workplace_type"), // 'remote' | 'on-site' | 'hybrid'
    remoteRegions: jsonb("remote_regions").$type<string[]>(),
    fitScore: integer("fit_score"),
    scoreReasoning: text("score_reasoning"),
    matchedSkills: jsonb("matched_skills").$type<string[]>().default([]),
    missingSkills: jsonb("missing_skills").$type<string[]>().default([]),
    gaps: jsonb("gaps").$type<string[]>().default([]),
    coverLetterDraft: text("cover_letter_draft"),
    tailoredResume: text("tailored_resume"),
    tailoredResumeData: jsonb("tailored_resume_data").$type<TailoredResumeData>(),
    status: text("status", { enum: jobStatusEnum })
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
    userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    externalId: text("external_id").notNull(),
    deletedAt: timestamp("deleted_at").defaultNow().notNull(),
  },
  (table) => [
    unique("uniq_deleted_user_source_external").on(table.userId, table.source, table.externalId),
    index("deleted_jobs_user_id_idx").on(table.userId),
  ]
);


