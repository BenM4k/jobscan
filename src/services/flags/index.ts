import "server-only";
import * as flagsDal from "@/dal/flags.dal";
import type {
  UserFeatureFlagView,
  FeatureFlagAssignmentWithUser,
} from "@/dal/flags.dal";
import {
  isFeatureEnabled,
  invalidateFeatureFlagCache,
  getFeatureFlagCacheKey,
  FEATURE_FLAG_CACHE_TTL_SECONDS,
} from "./is-enabled";

export {
  isFeatureEnabled,
  invalidateFeatureFlagCache,
  getFeatureFlagCacheKey,
  FEATURE_FLAG_CACHE_TTL_SECONDS,
};

export const FEATURE_FLAGS = {
  HYBRID_SCORING_V1: "hybrid-scoring-v1",
  HYBRID_SCORING: "hybrid_scoring",
  NEW_ADAPTERS: "new_adapters",
} as const;

export type FeatureFlagKey =
  | (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS]
  | string;

export type { UserFeatureFlagView, FeatureFlagAssignmentWithUser };

/**
 * Backward-compatible alias for isFeatureEnabled.
 */
export const isEnabled = isFeatureEnabled;

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
 * Immediately invalidates the 60-second Redis cache entry for this user and flag.
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

    // Step 18: Invalidate Redis cache immediately rather than waiting out TTL
    await invalidateFeatureFlagCache(flagKey, userId);

    return { success: true };
  } catch (err) {
    console.error(`[Flags] Failed to set override for flag "${flagKey}":`, err);
    return {
      success: false,
      error: "Failed to update feature flag",
    };
  }
}

/**
 * Update the global state of a feature flag and invalidate default/anonymous cache as well as all cached user evaluations.
 */
export async function setGlobalFlagState(
  flagKey: string,
  enabledGlobally: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await flagsDal.setGlobalFeatureFlag(flagKey, enabledGlobally);
    if (!success) {
      return { success: false, error: `Feature flag "${flagKey}" not found` };
    }

    // Invalidate anonymous/default cache entry and all affected user evaluations
    await invalidateFeatureFlagCache(flagKey, null);

    return { success: true };
  } catch (err) {
    console.error(`[Flags] Failed to set global state for flag "${flagKey}":`, err);
    return {
      success: false,
      error: "Failed to update global flag state",
    };
  }
}

/**
 * Admin: Get all per-user overrides with user email and flag details.
 */
export async function getAdminFeatureFlagAssignments(
  flagKey?: string
): Promise<FeatureFlagAssignmentWithUser[]> {
  return await flagsDal.getFeatureFlagAssignmentsWithUsers(flagKey);
}

/**
 * Admin: Search users by email for override assignment.
 */
export async function searchUsersForFlagAssignment(
  query: string
): Promise<{ id: string; email: string; name: string | null }[]> {
  return await flagsDal.searchUsersByEmail(query);
}
