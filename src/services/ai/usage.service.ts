import "server-only";
import * as opsDal from "@/dal/ops.dal";
import { ok, err, type Result } from "@/lib/result";
import type { AppError } from "@/lib/errors";

export interface UserAiUsage {
  usedCount: number;
  monthlyLimit: number;
  remainingCount: number;
  percentUsed: number;
  totalTokens: number;
  totalCostEstimateUsd: string;
}

/**
 * Retrieves the user's monthly AI usage statistics and computes remaining limits.
 */
export async function getUserAiUsage(
  userId: string,
  monthlyLimit = 50
): Promise<Result<UserAiUsage, AppError>> {
  const summaryRes = await opsDal.getUserAiUsageSummary(userId, monthlyLimit);
  if (!summaryRes.ok) {
    return err(summaryRes.error);
  }

  const { usedCount, totalTokens, totalCostEstimateUsd } = summaryRes.value;
  const remainingCount = Math.max(0, monthlyLimit - usedCount);
  const percentUsed = Math.min(100, Math.round((usedCount / monthlyLimit) * 100));

  return ok({
    usedCount,
    monthlyLimit,
    remainingCount,
    percentUsed,
    totalTokens,
    totalCostEstimateUsd,
  });
}
