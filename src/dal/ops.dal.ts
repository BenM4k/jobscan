import "server-only";
import { db } from "@/services/db";
import { aiCallLog, aiFeatureEnum, appSetting } from "@/services/db/schema";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import * as flagsDal from "./flags.dal";

import { eq, and, gte, count, sql } from "drizzle-orm";

export type AiFeature = (typeof aiFeatureEnum.enumValues)[number];

export interface LogAiCallParams {
  userId?: string | null;
  feature: AiFeature;
  provider: string;
  model: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  costEstimateUsd?: string | null;
  cacheHit?: boolean;
}

export interface UserAiUsageSummary {
  usedCount: number;
  monthlyLimit: number;
  totalTokens: number;
  totalCostEstimateUsd: string;
  cacheHitCount: number;
  periodStart: Date;
}

const defaultLogAiCallImpl = async (
  params: LogAiCallParams,
): Promise<Result<void, AppError>> => {
  try {
    await db.insert(aiCallLog).values({
      userId: params.userId,
      feature: params.feature,
      provider: params.provider,
      model: params.model,
      inputTokens: params.inputTokens ?? null,
      outputTokens: params.outputTokens ?? null,
      costEstimateUsd: params.costEstimateUsd ?? null,
      cacheHit: params.cacheHit ?? false,
    });
    return ok(undefined);
  } catch (error) {
    console.error("Failed to log AI call:", error);
    return err(new AppError("DB_ERROR", "Failed to log AI call", error));
  }
};

let logAiCallImpl = defaultLogAiCallImpl;

export async function logAiCall(
  params: LogAiCallParams,
): Promise<Result<void, AppError>> {
  return logAiCallImpl(params);
}

export function setLogAiCallImplementation(
  impl?: (params: LogAiCallParams) => Promise<Result<void, AppError>>,
) {
  logAiCallImpl = impl || defaultLogAiCallImpl;
}

/**
 * Aggregates user AI calls for the current monthly period.
 */
export async function getUserAiUsageSummary(
  userId: string,
  monthlyLimit: number = 50,
): Promise<Result<UserAiUsageSummary, AppError>> {
  try {
    const now = new Date();
    const periodStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );

    const [row] = await db
      .select({
        usedCount: count(),
        totalTokens: sql<number>`COALESCE(SUM(COALESCE(${aiCallLog.inputTokens}, 0) + COALESCE(${aiCallLog.outputTokens}, 0)), 0)`,
        totalCost: sql<string>`COALESCE(SUM(COALESCE(${aiCallLog.costEstimateUsd}, 0)), 0)`,
        cacheHitCount: sql<number>`COUNT(*) FILTER (WHERE ${aiCallLog.cacheHit} = true)`,
      })
      .from(aiCallLog)
      .where(
        and(
          eq(aiCallLog.userId, userId),
          gte(aiCallLog.createdAt, periodStart),
        ),
      );

    return ok({
      usedCount: Number(row?.usedCount ?? 0),
      monthlyLimit,
      totalTokens: Number(row?.totalTokens ?? 0),
      totalCostEstimateUsd: Number(row?.totalCost ?? 0).toFixed(4),
      cacheHitCount: Number(row?.cacheHitCount ?? 0),
      periodStart,
    });
  } catch (error) {
    console.error("Failed to get user AI usage summary:", error);
    return err(
      new AppError("DB_ERROR", "Failed to get user AI usage summary", error),
    );
  }
}

export async function isFeatureEnabled(
  key: string,
  userId?: string,
): Promise<boolean> {
  try {
    const flag = await flagsDal.getFeatureFlagByKey(key);
    if (!flag) return false;

    if (userId) {
      const assignment = await flagsDal.getFeatureFlagAssignment(
        flag.id,
        userId,
      );
      if (assignment) return assignment.enabled;
    }

    return flag.enabledGlobally;
  } catch {
    return false;
  }
}

export async function getAppSetting(
  key: string,
): Promise<Result<string | null, AppError>> {
  try {
    const [row] = await db
      .select({ value: appSetting.value })
      .from(appSetting)
      .where(eq(appSetting.key, key))
      .limit(1);
    return ok(row?.value ?? null);
  } catch (error) {
    return err(
      new AppError(
        "DB_ERROR",
        "Failed to read application setting",
        error,
      ),
    );
  }
}

export async function upsertAppSetting(
  key: string,
  value: string,
  updatedBy?: string | null,
): Promise<Result<void, AppError>> {
  try {
    await db
      .insert(appSetting)
      .values({
        key,
        value,
        updatedBy: updatedBy ?? null,
      })
      .onConflictDoUpdate({
        target: appSetting.key,
        set: {
          value,
          updatedBy: updatedBy ?? null,
          updatedAt: new Date(),
        },
      });
    return ok(undefined);
  } catch (error) {
    return err(
      new AppError(
        "DB_ERROR",
        "Failed to save application setting",
        error,
      ),
    );
  }
}
