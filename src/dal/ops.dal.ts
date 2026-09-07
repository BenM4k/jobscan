import "server-only";
import { db } from "@/services/db";
import { aiCallLog, aiFeatureEnum } from "@/services/db/schema";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import * as flagsDal from "./flags.dal";

export type AiFeature = (typeof aiFeatureEnum.enumValues)[number];

export interface LogAiCallParams {
  userId: string;
  feature: AiFeature;
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  costEstimateUsd?: string;
  cacheHit?: boolean;
}

export async function logAiCall(
  params: LogAiCallParams
): Promise<Result<void, AppError>> {
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
