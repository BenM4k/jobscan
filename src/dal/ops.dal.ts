import "server-only";
import { db } from "@/services/db";
import { aiCallLog, aiFeatureEnum } from "@/services/db/schema";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import * as flagsDal from "./flags.dal";

import { eq, and, gte } from "drizzle-orm";

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
  params: LogAiCallParams
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
  params: LogAiCallParams
): Promise<Result<void, AppError>> {
  return logAiCallImpl(params);
}

export function setLogAiCallImplementation(
  impl?: (params: LogAiCallParams) => Promise<Result<void, AppError>>
) {
  logAiCallImpl = impl || defaultLogAiCallImpl;
}

/**
 * Aggregates user AI calls for the current monthly period.
 */
export async function getUserAiUsageSummary(
  userId: string,
  monthlyLimit: number = 50
): Promise<Result<UserAiUsageSummary, AppError>> {
  try {
    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const rows = await db
      .select({
        inputTokens: aiCallLog.inputTokens,
        outputTokens: aiCallLog.outputTokens,
        costEstimateUsd: aiCallLog.costEstimateUsd,
        cacheHit: aiCallLog.cacheHit,
      })
      .from(aiCallLog)
      .where(
        and(
          eq(aiCallLog.userId, userId),
          gte(aiCallLog.createdAt, periodStart)
        )
      );

    let totalTokens = 0;
    let totalCost = 0;
    let cacheHitCount = 0;

    for (const r of rows) {
      totalTokens += (r.inputTokens || 0) + (r.outputTokens || 0);
      if (r.costEstimateUsd) {
        totalCost += parseFloat(r.costEstimateUsd) || 0;
      }
      if (r.cacheHit) {
        cacheHitCount++;
      }
    }

    return ok({
      usedCount: rows.length,
      monthlyLimit,
      totalTokens,
      totalCostEstimateUsd: totalCost.toFixed(4),
      cacheHitCount,
      periodStart,
    });
  } catch (error) {
    console.error("Failed to get user AI usage summary:", error);
    return err(new AppError("DB_ERROR", "Failed to get user AI usage summary", error));
  }
}

export async function isFeatureEnabled(
  key: string,
  userId?: string
): Promise<boolean> {
  try {
    const flag = await flagsDal.getFeatureFlagByKey(key);
    if (!flag) return false;

    if (userId) {
      const assignment = await flagsDal.getFeatureFlagAssignment(flag.id, userId);
      if (assignment) return assignment.enabled;
    }

    return flag.enabledGlobally;
  } catch {
    return false;
  }
}
