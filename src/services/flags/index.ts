import "server-only";
import * as flagsDal from "@/dal/flags.dal";
import type { UserFeatureFlagView } from "@/dal/flags.dal";

export const FEATURE_FLAGS = {
  HYBRID_SCORING: "hybrid_scoring",
  NEW_ADAPTERS: "new_adapters",
} as const;

export type FeatureFlagKey =
  | (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS]
  | string;

export type { UserFeatureFlagView };

/**
 * Checks whether a feature flag is enabled for a given user.
 * Evaluates the per-user override in featureFlagAssignment first via flagsDal.
 * If no per-user assignment exists, falls back to the global flag (enabledGlobally).
 */
export async function isEnabled(
  userId: string | undefined | null,
  flagKey: FeatureFlagKey
): Promise<boolean> {
  try {
    const flag = await flagsDal.getFeatureFlagByKey(flagKey);
    if (!flag) {
      return false;
    }

    // 1. Check per-user override first
    if (userId) {
      const assignment = await flagsDal.getFeatureFlagAssignment(
        flag.id,
        userId
      );
      if (assignment) {
        return assignment.enabled;
      }
    }

    // 2. Fallback to global flag
    return flag.enabledGlobally;
  } catch (err) {
    console.error(`[Flags] Error evaluating feature flag "${flagKey}":`, err);
    return false;
  }
}

/**
 * Get all available feature flags with the user's specific state for the settings UI.
 */
export async function getUserFeatureFlags(
  userId: string
): Promise<UserFeatureFlagView[]> {
  return await flagsDal.getUserFeatureFlagsWithAssignments(userId);
}

/**
 * Sets or clears a user's feature flag override.
 * Passing enabled = null removes the override (reverts to global state).
 */
export async function setUserFeatureFlagOverride(
  userId: string,
  flagKey: string,
  enabled: boolean | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const flag = await flagsDal.getFeatureFlagByKey(flagKey);
    if (!flag) {
      return { success: false, error: `Feature flag "${flagKey}" not found` };
    }

    if (enabled === null) {
      await flagsDal.deleteUserFeatureFlagAssignment(flag.id, userId);
    } else {
      await flagsDal.upsertUserFeatureFlagAssignment(flag.id, userId, enabled);
    }

    return { success: true };
  } catch (err) {
    console.error(`[Flags] Failed to set override for flag "${flagKey}":`, err);
    return {
      success: false,
      error: "Failed to update feature flag",
    };
  }
}
