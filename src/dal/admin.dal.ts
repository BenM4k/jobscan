import "server-only";

import { db } from "@/services/db";
import {
  user as userTable,
  session as sessionTable,
  creditBalance as creditBalanceTable,
  creditLedger as creditLedgerTable,
  subscription as subscriptionTable,
  subscriptionPlan as subscriptionPlanTable,
  job as jobTable,
  aiCallLog as aiCallLogTable,
  aiFeatureEnum,
  adapterCircuitBreaker as circuitBreakerTable,
} from "@/services/db/schema";
import { eq, desc, sql, and, or, ilike, count, sum } from "drizzle-orm";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";

export interface AdminOverviewStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalCreditsIssued: number;
  totalCreditsSpent: number;
  totalJobs: number;
  totalAiCalls: number;
}

export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: string;
  banned: boolean;
  banReason: string | null;
  banExpires: Date | null;
  creditBalance: number;
  subscriptionStatus: string | null;
  subscriptionPlanName: string | null;
  createdAt: Date;
}

export interface AdminUsersFilter {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  banned?: boolean;
}

/**
 * Fetch high-level administration overview metrics.
 */
export async function getAdminOverviewStats(): Promise<Result<AdminOverviewStats, AppError>> {
  try {
    const [
      userCountRes,
      subCountRes,
      creditsRes,
      jobCountRes,
      aiCountRes,
    ] = await Promise.all([
      db.select({ count: count() }).from(userTable),
      db.select({ count: count() }).from(subscriptionTable).where(eq(subscriptionTable.status, "active")),
      db
        .select({
          issued: sum(sql<number>`CASE WHEN ${creditLedgerTable.amount} > 0 THEN ${creditLedgerTable.amount} ELSE 0 END`),
          spent: sum(sql<number>`CASE WHEN ${creditLedgerTable.amount} < 0 THEN ABS(${creditLedgerTable.amount}) ELSE 0 END`),
        })
        .from(creditLedgerTable),
      db.select({ count: count() }).from(jobTable),
      db.select({ count: count() }).from(aiCallLogTable),
    ]);

    return ok({
      totalUsers: Number(userCountRes[0]?.count ?? 0),
      activeSubscriptions: Number(subCountRes[0]?.count ?? 0),
      totalCreditsIssued: Number(creditsRes[0]?.issued ?? 0),
      totalCreditsSpent: Number(creditsRes[0]?.spent ?? 0),
      totalJobs: Number(jobCountRes[0]?.count ?? 0),
      totalAiCalls: Number(aiCountRes[0]?.count ?? 0),
    });
  } catch (error) {
    console.error("[Admin DAL] Failed to fetch overview stats:", error);
    return err(new AppError("DB_ERROR", "Failed to fetch overview stats", error));
  }
}

/**
 * Paginated query for users with their credit balance and subscription status.
 */
export async function getAdminUsersList(
  filter: AdminUsersFilter = {}
): Promise<Result<{ users: AdminUserListItem[]; totalCount: number; page: number; totalPages: number }, AppError>> {
  try {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
    const offset = (page - 1) * limit;

    const conditions = [];

    if (filter.search?.trim()) {
      const term = `%${filter.search.trim()}%`;
      conditions.push(or(ilike(userTable.email, term), ilike(userTable.name, term)));
    }

    if (filter.role) {
      conditions.push(eq(userTable.role, filter.role));
    }

    if (filter.banned !== undefined) {
      conditions.push(eq(userTable.banned, filter.banned));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRes, rows] = await Promise.all([
      db.select({ count: count() }).from(userTable).where(whereClause),
      db
        .select({
          id: userTable.id,
          name: userTable.name,
          email: userTable.email,
          emailVerified: userTable.emailVerified,
          image: userTable.image,
          role: userTable.role,
          banned: userTable.banned,
          banReason: userTable.banReason,
          banExpires: userTable.banExpires,
          createdAt: userTable.createdAt,
          creditBalance: sql<number>`COALESCE(${creditBalanceTable.balance}, 0)`,
          subscriptionStatus: subscriptionTable.status,
          subscriptionPlanName: subscriptionPlanTable.name,
        })
        .from(userTable)
        .leftJoin(creditBalanceTable, eq(userTable.id, creditBalanceTable.userId))
        .leftJoin(subscriptionTable, and(eq(userTable.id, subscriptionTable.userId), eq(subscriptionTable.status, "active")))
        .leftJoin(subscriptionPlanTable, eq(subscriptionTable.planId, subscriptionPlanTable.id))
        .where(whereClause)
        .orderBy(desc(userTable.createdAt))
        .limit(limit)
        .offset(offset),
    ]);

    const totalCount = Number(totalRes[0]?.count ?? 0);
    const totalPages = Math.ceil(totalCount / limit) || 1;

    const users: AdminUserListItem[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      emailVerified: r.emailVerified,
      image: r.image,
      role: r.role,
      banned: r.banned,
      banReason: r.banReason,
      banExpires: r.banExpires,
      creditBalance: Number(r.creditBalance),
      subscriptionStatus: r.subscriptionStatus,
      subscriptionPlanName: r.subscriptionPlanName,
      createdAt: r.createdAt,
    }));

    return ok({ users, totalCount, page, totalPages });
  } catch (error) {
    console.error("[Admin DAL] Failed to fetch users list:", error);
    return err(new AppError("DB_ERROR", "Failed to fetch users list", error));
  }
}

/**
 * Retrieve comprehensive details for a specific user.
 */
export async function getAdminUserDetails(userId: string): Promise<
  Result<{
    user: typeof userTable.$inferSelect;
    creditBalance: number;
    activeSubscription: (typeof subscriptionTable.$inferSelect & { planName?: string }) | null;
    recentLedger: (typeof creditLedgerTable.$inferSelect)[];
    recentSessions: (typeof sessionTable.$inferSelect)[];
    aiCallsCount: number;
  } | null, AppError>
> {
  try {
    const [userRow] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1);

    if (!userRow) return ok(null);

    const [
      balanceRow,
      subRows,
      ledgerRows,
      sessionRows,
      aiCountRes,
    ] = await Promise.all([
      db.select({ balance: creditBalanceTable.balance }).from(creditBalanceTable).where(eq(creditBalanceTable.userId, userId)).limit(1),
      db
        .select({
          sub: subscriptionTable,
          planName: subscriptionPlanTable.name,
        })
        .from(subscriptionTable)
        .leftJoin(subscriptionPlanTable, eq(subscriptionTable.planId, subscriptionPlanTable.id))
        .where(eq(subscriptionTable.userId, userId))
        .orderBy(desc(subscriptionTable.createdAt))
        .limit(1),
      db
        .select()
        .from(creditLedgerTable)
        .where(eq(creditLedgerTable.userId, userId))
        .orderBy(desc(creditLedgerTable.createdAt))
        .limit(20),
      db
        .select()
        .from(sessionTable)
        .where(eq(sessionTable.userId, userId))
        .orderBy(desc(sessionTable.createdAt))
        .limit(10),
      db
        .select({ count: count() })
        .from(aiCallLogTable)
        .where(eq(aiCallLogTable.userId, userId)),
    ]);

    const activeSubscription = subRows[0]
      ? { ...subRows[0].sub, planName: subRows[0].planName ?? undefined }
      : null;

    return ok({
      user: userRow,
      creditBalance: balanceRow[0]?.balance ?? 0,
      activeSubscription,
      recentLedger: ledgerRows,
      recentSessions: sessionRows,
      aiCallsCount: Number(aiCountRes[0]?.count ?? 0),
    });
  } catch (error) {
    console.error(`[Admin DAL] Failed to fetch details for user ${userId}:`, error);
    return err(new AppError("DB_ERROR", "Failed to fetch user details", error));
  }
}

/**
 * Update user role.
 */
export async function updateUserRoleInDb(
  userId: string,
  role: string
): Promise<Result<void, AppError>> {
  try {
    await db
      .update(userTable)
      .set({ role, updatedAt: new Date() })
      .where(eq(userTable.id, userId));

    return ok(undefined);
  } catch (error) {
    console.error(`[Admin DAL] Failed to update role for user ${userId}:`, error);
    return err(new AppError("DB_ERROR", "Failed to update user role", error));
  }
}

/**
 * Update user ban status.
 */
export async function updateUserBanInDb(
  userId: string,
  banned: boolean,
  banReason?: string | null,
  banExpires?: Date | null
): Promise<Result<void, AppError>> {
  try {
    await db
      .update(userTable)
      .set({
        banned,
        banReason: banned ? banReason ?? "Banned by administrator" : null,
        banExpires: banned ? banExpires ?? null : null,
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, userId));

    return ok(undefined);
  } catch (error) {
    console.error(`[Admin DAL] Failed to update ban for user ${userId}:`, error);
    return err(new AppError("DB_ERROR", "Failed to update user ban status", error));
  }
}

/**
 * Query audit credit ledger transactions.
 */
export async function getAdminCreditLedger(filter: {
  page?: number;
  limit?: number;
  userId?: string;
}): Promise<
  Result<{
    items: Array<
      typeof creditLedgerTable.$inferSelect & {
        userName: string | null;
        userEmail: string | null;
      }
    >;
    totalCount: number;
    page: number;
    totalPages: number;
  }, AppError>
> {
  try {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 25));
    const offset = (page - 1) * limit;

    const condition = filter.userId ? eq(creditLedgerTable.userId, filter.userId) : undefined;

    const [totalRes, rows] = await Promise.all([
      db.select({ count: count() }).from(creditLedgerTable).where(condition),
      db
        .select({
          ledger: creditLedgerTable,
          userName: userTable.name,
          userEmail: userTable.email,
        })
        .from(creditLedgerTable)
        .leftJoin(userTable, eq(creditLedgerTable.userId, userTable.id))
        .where(condition)
        .orderBy(desc(creditLedgerTable.createdAt))
        .limit(limit)
        .offset(offset),
    ]);

    const totalCount = Number(totalRes[0]?.count ?? 0);
    const totalPages = Math.ceil(totalCount / limit) || 1;

    const items = rows.map((r) => ({
      ...r.ledger,
      userName: r.userName,
      userEmail: r.userEmail,
    }));

    return ok({ items, totalCount, page, totalPages });
  } catch (error) {
    console.error("[Admin DAL] Failed to fetch credit ledger:", error);
    return err(new AppError("DB_ERROR", "Failed to fetch credit ledger", error));
  }
}

/**
 * Query AI call telemetry logs.
 */
export async function getAdminAiLogs(filter: {
  page?: number;
  limit?: number;
  feature?: string;
  userId?: string;
}): Promise<
  Result<{
    items: Array<
      typeof aiCallLogTable.$inferSelect & {
        userName: string | null;
        userEmail: string | null;
      }
    >;
    totalCount: number;
    page: number;
    totalPages: number;
    totalCostUsd: number;
  }, AppError>
> {
  try {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 25));
    const offset = (page - 1) * limit;

    const conditions = [];
    if (filter.userId) {
      conditions.push(eq(aiCallLogTable.userId, filter.userId));
    }
    if (filter.feature) {
      conditions.push(
        eq(
          aiCallLogTable.feature,
          filter.feature as (typeof aiFeatureEnum.enumValues)[number]
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRes, costRes, rows] = await Promise.all([
      db.select({ count: count() }).from(aiCallLogTable).where(whereClause),
      db.select({ totalCost: sum(sql<number>`COALESCE(${aiCallLogTable.costEstimateUsd}::numeric, 0)`) }).from(aiCallLogTable).where(whereClause),
      db
        .select({
          log: aiCallLogTable,
          userName: userTable.name,
          userEmail: userTable.email,
        })
        .from(aiCallLogTable)
        .leftJoin(userTable, eq(aiCallLogTable.userId, userTable.id))
        .where(whereClause)
        .orderBy(desc(aiCallLogTable.createdAt))
        .limit(limit)
        .offset(offset),
    ]);

    const totalCount = Number(totalRes[0]?.count ?? 0);
    const totalPages = Math.ceil(totalCount / limit) || 1;
    const totalCostUsd = Number(costRes[0]?.totalCost ?? 0);

    const items = rows.map((r) => ({
      ...r.log,
      userName: r.userName,
      userEmail: r.userEmail,
    }));

    return ok({ items, totalCount, page, totalPages, totalCostUsd });
  } catch (error) {
    console.error("[Admin DAL] Failed to fetch AI logs:", error);
    return err(new AppError("DB_ERROR", "Failed to fetch AI logs", error));
  }
}

/**
 * Summary of job sources and circuit breaker status.
 */
export async function getAdminJobSourcesSummary(): Promise<
  Result<Array<{
    source: string;
    totalJobs: number;
    lastIngestedAt: Date | null;
    circuitBreakerState: string | null;
    failureCount: number;
  }>, AppError>
> {
  try {
    const [sourceCounts, breakers] = await Promise.all([
      db
        .select({
          source: jobTable.source,
          totalJobs: count(),
          lastIngestedAt: sql<Date | null>`MAX(${jobTable.createdAt})`,
        })
        .from(jobTable)
        .groupBy(jobTable.source),
      db.select().from(circuitBreakerTable),
    ]);

    const breakerMap = new Map(breakers.map((b) => [b.source, b]));

    const summary = sourceCounts.map((s) => {
      const breaker = breakerMap.get(s.source);
      return {
        source: s.source,
        totalJobs: Number(s.totalJobs),
        lastIngestedAt: s.lastIngestedAt,
        circuitBreakerState: breaker ? breaker.state : "closed",
        failureCount: breaker ? breaker.consecutiveFailures : 0,
      };
    });

    return ok(summary);
  } catch (error) {
    console.error("[Admin DAL] Failed to fetch job sources summary:", error);
    return err(new AppError("DB_ERROR", "Failed to fetch job sources summary", error));
  }
}
