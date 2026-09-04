if (typeof window !== "undefined") {
  throw new Error("This module can only be executed on the server.");
}
import { db } from "@/services/db";
import { aiCallLog, aiFeatureEnum, featureFlag, featureFlagAssignment } from "@/services/db/schema";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import { eq, and } from "drizzle-orm";

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
    const [flag] = await db
      .select()
      .from(featureFlag)
      .where(eq(featureFlag.key, key))
      .limit(1);

    if (!flag) return false;
    if (flag.enabledGlobally) return true;

    if (userId) {
      const [assignment] = await db
        .select()
        .from(featureFlagAssignment)
        .where(
          and(
            eq(featureFlagAssignment.featureFlagId, flag.id),
            eq(featureFlagAssignment.userId, userId)
          )
        )
        .limit(1);

      if (assignment) return assignment.enabled;
    }

    return false;
  } catch {
    return false;
  }
}
