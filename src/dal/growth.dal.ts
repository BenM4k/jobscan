import "server-only";

import { db } from "@/services/db";
import {
  user,
  userPreference,
  digestEmailLog,
  job,
  masterResume,
} from "@/services/db/schema";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import { eq, and, desc, sql, ne, isNull, gte, notInArray, isNotNull } from "drizzle-orm";

export interface DigestUser {
  id: string;
  name: string;
  email: string;
  locale: string;
  digestEmailEnabled: boolean;
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
  matchPercent?: number;
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
      digestEmailEnabled: r.digestEmailEnabled ?? true,
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
      digestEmailEnabled: row.digestEmailEnabled ?? true,
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
      .where(
        and(
          ne(job.source, "manual"),
          isNull(job.addedByUserId),
          eq(job.status, "active")
        )
      )
      .orderBy(desc(job.createdAt))
      .limit(limit);

    return ok(jobs);
  } catch (error) {
    console.error("Failed to fetch recent digest jobs:", error);
    return err(new AppError("DB_ERROR", "Failed to fetch recent digest jobs", error));
  }
}

/** Lists unique job IDs already included in recent digest emails for a user. */
export async function getPreviouslyEmailedJobIds(
  userId: string,
  lookbackDays = 30
): Promise<Result<string[], AppError>> {
  try {
    const cutoff = new Date(Date.now() - lookbackDays * 86400 * 1000);
    const logs = await db
      .select({ jobIdsIncluded: digestEmailLog.jobIdsIncluded })
      .from(digestEmailLog)
      .where(and(eq(digestEmailLog.userId, userId), gte(digestEmailLog.sentAt, cutoff)));

    const seen = new Set<string>();
    for (const log of logs) {
      if (Array.isArray(log.jobIdsIncluded)) {
        for (const id of log.jobIdsIncluded) {
          if (typeof id === "string" && id) seen.add(id);
        }
      }
    }
    return ok(Array.from(seen));
  } catch (error) {
    console.error(`Failed to fetch prior digest job IDs for ${userId}:`, error);
    return err(new AppError("DB_ERROR", "Failed to fetch digest history", error));
  }
}

/**
 * Fetches personalized active public jobs for a user, ranked by active resume embedding similarity
 * when available and excluding previously emailed or private manual postings.
 */
export async function getPersonalizedDigestJobs(
  userId: string,
  limit = 5,
  excludedJobIds: string[] = []
): Promise<Result<DigestJobSummary[], AppError>> {
  try {
    const baseConditions = [
      ne(job.source, "manual"),
      isNull(job.addedByUserId),
      eq(job.status, "active"),
      ...(excludedJobIds.length > 0 ? [notInArray(job.id, excludedJobIds)] : []),
    ];

    const [activeResume] = await db
      .select({ embedding: masterResume.embedding })
      .from(masterResume)
      .where(and(eq(masterResume.userId, userId), eq(masterResume.isActive, true)))
      .limit(1);

    const results: DigestJobSummary[] = [];
    const seenIds = new Set<string>(excludedJobIds);

    if (activeResume?.embedding && Array.isArray(activeResume.embedding)) {
      const vectorString = `[${activeResume.embedding.join(",")}]`;
      const distanceExpr = sql<number>`(${job.embedding} <=> ${vectorString}::vector)`;
      const similarityExpr = sql<number>`1 - (${distanceExpr})`;
      const recencyCutoff = new Date(Date.now() - 14 * 86400 * 1000);

      const matched = await db
        .select({
          id: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          url: job.url,
          source: job.source,
          createdAt: job.createdAt,
          similarity: similarityExpr,
        })
        .from(job)
        .where(
          and(
            ...baseConditions,
            isNotNull(job.embedding),
            gte(sql`COALESCE(${job.postedAt}, ${job.createdAt})`, recencyCutoff)
          )
        )
        .orderBy(sql`${distanceExpr} ASC`)
        .limit(limit);

      for (const row of matched) {
        seenIds.add(row.id);
        const sim = Number(row.similarity);
        results.push({
          id: row.id,
          title: row.title,
          company: row.company,
          location: row.location,
          url: row.url,
          source: row.source,
          createdAt: row.createdAt,
          matchPercent: Number.isFinite(sim)
            ? Math.max(0, Math.min(100, Math.round(sim * 100)))
            : undefined,
        });
      }
    }

    if (results.length < limit) {
      const remaining = limit - results.length;
      const excludeAll = Array.from(seenIds);
      const fallbackRows = await db
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
        .where(
          and(
            ne(job.source, "manual"),
            isNull(job.addedByUserId),
            eq(job.status, "active"),
            ...(excludeAll.length > 0 ? [notInArray(job.id, excludeAll)] : [])
          )
        )
        .orderBy(sql`${job.postedAt} DESC NULLS LAST`, desc(job.createdAt))
        .limit(remaining);

      results.push(...fallbackRows);
    }

    return ok(results);
  } catch (error) {
    console.error(`Failed to fetch personalized digest jobs for ${userId}:`, error);
    return err(new AppError("DB_ERROR", "Failed to fetch personalized digest jobs", error));
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

export interface UserPreferencesData {
  locale: string;
  digestEmailEnabled: boolean;
  digestEmailFrequency: "daily" | "weekly";
}

export async function getUserPreferences(
  userId: string
): Promise<Result<UserPreferencesData, AppError>> {
  try {
    const [row] = await db
      .select({
        locale: userPreference.locale,
        digestEmailEnabled: userPreference.digestEmailEnabled,
        digestEmailFrequency: userPreference.digestEmailFrequency,
      })
      .from(userPreference)
      .where(eq(userPreference.userId, userId))
      .limit(1);

    if (!row) {
      return ok({
        locale: "en",
        digestEmailEnabled: true,
        digestEmailFrequency: "weekly",
      });
    }

    return ok({
      locale: row.locale || "en",
      digestEmailEnabled: row.digestEmailEnabled ?? true,
      digestEmailFrequency:
        (row.digestEmailFrequency as "daily" | "weekly") || "weekly",
    });
  } catch (error) {
    console.error("Failed to get user preferences:", error);
    return err(new AppError("DB_ERROR", "Failed to get user preferences", error));
  }
}

export async function upsertUserPreferences(
  userId: string,
  data: Partial<UserPreferencesData>
): Promise<Result<void, AppError>> {
  try {
    await db
      .insert(userPreference)
      .values({
        userId,
        locale: data.locale ?? "en",
        digestEmailEnabled: data.digestEmailEnabled ?? true,
        digestEmailFrequency: data.digestEmailFrequency ?? "weekly",
      })
      .onConflictDoUpdate({
        target: [userPreference.userId],
        set: {
          ...(data.locale ? { locale: data.locale } : {}),
          ...(data.digestEmailEnabled !== undefined
            ? { digestEmailEnabled: data.digestEmailEnabled }
            : {}),
          ...(data.digestEmailFrequency
            ? { digestEmailFrequency: data.digestEmailFrequency }
            : {}),
          updatedAt: new Date(),
        },
      });

    return ok(undefined);
  } catch (error) {
    console.error("Failed to update user preferences:", error);
    return err(new AppError("DB_ERROR", "Failed to update user preferences", error));
  }
}

/** Disables digest email delivery for a user via signed one-click unsubscribe. */
export async function disableDigestEmailsForUser(
  userId: string
): Promise<Result<void, AppError>> {
  return await upsertUserPreferences(userId, { digestEmailEnabled: false });
}

