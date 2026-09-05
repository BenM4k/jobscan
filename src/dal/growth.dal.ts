if (typeof window !== "undefined") {
  throw new Error("This module can only be executed on the server.");
}

import { db } from "@/services/db";
import {
  user,
  userPreference,
  digestEmailLog,
  job,
} from "@/services/db/schema";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import { eq, and, desc, sql } from "drizzle-orm";

export interface DigestUser {
  id: string;
  name: string;
  email: string;
  locale: string;
  frequency: "daily" | "weekly";
}

export interface DigestJobSummary {
  id: string;
  title: string;
  company: string;
  location: string | null;
  url: string | null;
  source: string;
  createdAt: Date;
}

export async function getEligibleDigestUsers(
  frequency?: "daily" | "weekly"
): Promise<Result<DigestUser[], AppError>> {
  try {
    const rows = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        locale: sql<string>`COALESCE(${userPreference.locale}, 'en')`,
        digestEmailEnabled: sql<boolean>`COALESCE(${userPreference.digestEmailEnabled}, true)`,
        digestEmailFrequency: sql<string>`COALESCE(${userPreference.digestEmailFrequency}, 'weekly')`,
      })
      .from(user)
      .leftJoin(userPreference, eq(user.id, userPreference.userId))
      .where(
        and(
          sql`COALESCE(${userPreference.digestEmailEnabled}, true) = true`,
          frequency
            ? sql`COALESCE(${userPreference.digestEmailFrequency}, 'weekly') = ${frequency}`
            : undefined
        )
      );

    const eligibleUsers: DigestUser[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      locale: r.locale,
      frequency: (r.digestEmailFrequency as "daily" | "weekly") || "weekly",
    }));

    return ok(eligibleUsers);
  } catch (error) {
    console.error("Failed to query eligible digest users:", error);
    return err(new AppError("DB_ERROR", "Failed to query eligible digest users", error));
  }
}

export async function getUserForDigest(
  userId: string
): Promise<Result<DigestUser | null, AppError>> {
  try {
    const [row] = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        locale: sql<string>`COALESCE(${userPreference.locale}, 'en')`,
        digestEmailEnabled: sql<boolean>`COALESCE(${userPreference.digestEmailEnabled}, true)`,
        digestEmailFrequency: sql<string>`COALESCE(${userPreference.digestEmailFrequency}, 'weekly')`,
      })
      .from(user)
      .leftJoin(userPreference, eq(user.id, userPreference.userId))
      .where(eq(user.id, userId))
      .limit(1);

    if (!row) return ok(null);

    return ok({
      id: row.id,
      name: row.name,
      email: row.email,
      locale: row.locale,
      frequency: (row.digestEmailFrequency as "daily" | "weekly") || "weekly",
    });
  } catch (error) {
    console.error(`Failed to query user ${userId} for digest:`, error);
    return err(new AppError("DB_ERROR", "Failed to query user for digest", error));
  }
}


export async function getRecentDigestJobs(
  limit = 5
): Promise<Result<DigestJobSummary[], AppError>> {
  try {
    const jobs = await db
      .select({
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        url: job.url,
        source: job.source,
        createdAt: job.createdAt,
      })
      .from(job)
      .orderBy(desc(job.createdAt))
      .limit(limit);

    return ok(jobs);
  } catch (error) {
    console.error("Failed to fetch recent digest jobs:", error);
    return err(new AppError("DB_ERROR", "Failed to fetch recent digest jobs", error));
  }
}

export async function recordDigestEmailLog(
  userId: string,
  jobIds: string[]
): Promise<Result<{ id: string }, AppError>> {
  try {
    const [inserted] = await db
      .insert(digestEmailLog)
      .values({
        userId,
        jobIdsIncluded: jobIds,
      })
      .returning({ id: digestEmailLog.id });

    return ok(inserted);
  } catch (error) {
    console.error(`Failed to record digest email log for user ${userId}:`, error);
    return err(new AppError("DB_ERROR", "Failed to record digest email log", error));
  }
}
