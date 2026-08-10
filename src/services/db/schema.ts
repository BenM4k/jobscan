import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  uuid,
  unique,
} from "drizzle-orm/pg-core";

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

export const session = pgTable("session", {
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
});

export const account = pgTable("account", {
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const verification = pgTable("verification", {
  id: uuid("id").defaultRandom().primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});


// ---------------------------------------------------------------------------
// 2. JobPilot App Tables
// ---------------------------------------------------------------------------
export const jobStatusEnum = [
  "new",
  "scored",
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
    source: text("source").notNull(), // 'greenhouse' | 'remoteok' | 'lever' | 'ashby'
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
    coverLetterDraft: text("cover_letter_draft"),
    tailoredResume: text("tailored_resume"),
    status: text("status", { enum: jobStatusEnum })
      .default("new")
      .notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqSourceExternal: unique().on(table.source, table.externalId),
  })
);

export const profile = pgTable("profile", {
  id: uuid("id").defaultRandom().primaryKey(),
  resumeText: text("resume_text").notNull(),
  skills: jsonb("skills").$type<string[]>().default([]),
  aiProvider: text("ai_provider").default("gemini").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const deletedJobs = pgTable(
  "deleted_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    source: text("source").notNull(),
    externalId: text("external_id").notNull(),
    deletedAt: timestamp("deleted_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqDeletedSourceExternal: unique().on(table.source, table.externalId),
  })
);

