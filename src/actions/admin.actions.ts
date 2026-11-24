"use server";

import { requireSession } from "@/lib/auth-guard";
import { isAdmin } from "@/services/auth/admin";
import {
  setUserFeatureFlagOverride,
  setGlobalFlagState,
  searchUsersForFlagAssignment,
  getAdminFeatureFlagAssignments,
  type FeatureFlagAssignmentWithUser,
} from "@/services/flags";
import { recordAdminAuditEvent } from "@/services/admin/admin.service";
import {
  SUPPORTED_AI_PROVIDERS,
  setGlobalAiProvider,
  type GlobalAiProvider,
} from "@/services/ai/provider-config";
import { SETTINGS_TAG, ADMIN_OVERVIEW_TAG, revalidateTags } from "@/lib/cache-tags";
import { ok, err, type Result } from "@/lib/result";
import { z } from "zod";

const searchUsersSchema = z.object({
  query: z.string().min(1).max(100),
});

const setOverrideSchema = z.object({
  targetUserId: z.string().uuid(),
  flagKey: z.string().min(1),
  enabled: z.boolean(),
});

const removeOverrideSchema = z.object({
  targetUserId: z.string().uuid(),
  flagKey: z.string().min(1),
});

const setGlobalFlagSchema = z.object({
  flagKey: z.string().min(1),
  enabled: z.boolean(),
});

const setGlobalAiProviderSchema = z.object({
  provider: z.enum(SUPPORTED_AI_PROVIDERS),
});

/**
 * Admin action: Search users by email for per-user override assignment.
 */
export async function searchUsersAction(
  query: string
): Promise<{ success: boolean; users?: { id: string; email: string; name: string | null }[]; error?: string }> {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value) {
    return { success: false, error: "Unauthorized" };
  }

  if (!isAdmin(sessionResult.value.user)) {
    return { success: false, error: "Forbidden: Admin privileges required" };
  }

  const parsed = searchUsersSchema.safeParse({ query });
  if (!parsed.success) {
    return { success: false, error: "Invalid search query" };
  }

  const users = await searchUsersForFlagAssignment(parsed.data.query);
  return { success: true, users };
}

/**
 * Admin action: Set or update a per-user feature flag override.
 * Invalidates that user's 60-second Redis cache entry immediately.
 */
export async function setUserFlagOverrideAction(
  targetUserId: string,
  flagKey: string,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value) {
    return { success: false, error: "Unauthorized" };
  }

  if (!isAdmin(sessionResult.value.user)) {
    return { success: false, error: "Forbidden: Admin privileges required" };
  }

  const parsed = setOverrideSchema.safeParse({ targetUserId, flagKey, enabled });
  if (!parsed.success) {
    return { success: false, error: "Invalid parameters" };
  }

  const res = await setUserFeatureFlagOverride(
    parsed.data.targetUserId,
    parsed.data.flagKey,
    parsed.data.enabled
  );

  if (res.success) {
    await recordAdminAuditEvent({
      adminUserId: sessionResult.value.user.id,
      targetUserId: parsed.data.targetUserId,
      action: "flag_user_override",
      metadata: { flagKey: parsed.data.flagKey, enabled: parsed.data.enabled },
    });
    revalidateTags([SETTINGS_TAG, ADMIN_OVERVIEW_TAG]);
  }

  return res;
}

/**
 * Admin action: Remove a per-user feature flag override (reverts user to global state).
 * Invalidates that user's 60-second Redis cache entry immediately.
 */
export async function removeUserFlagOverrideAction(
  targetUserId: string,
  flagKey: string
): Promise<{ success: boolean; error?: string }> {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value) {
    return { success: false, error: "Unauthorized" };
  }

  if (!isAdmin(sessionResult.value.user)) {
    return { success: false, error: "Forbidden: Admin privileges required" };
  }

  const parsed = removeOverrideSchema.safeParse({ targetUserId, flagKey });
  if (!parsed.success) {
    return { success: false, error: "Invalid parameters" };
  }

  const res = await setUserFeatureFlagOverride(
    parsed.data.targetUserId,
    parsed.data.flagKey,
    null
  );

  if (res.success) {
    await recordAdminAuditEvent({
      adminUserId: sessionResult.value.user.id,
      targetUserId: parsed.data.targetUserId,
      action: "flag_user_override_removed",
      metadata: { flagKey: parsed.data.flagKey },
    });
    revalidateTags([SETTINGS_TAG, ADMIN_OVERVIEW_TAG]);
  }

  return res;
}

/**
 * Admin action: Toggle the global on/off state of a feature flag.
 * Invalidates the default/anonymous Redis cache entry immediately.
 */
export async function setGlobalFlagAction(
  flagKey: string,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value) {
    return { success: false, error: "Unauthorized" };
  }

  if (!isAdmin(sessionResult.value.user)) {
    return { success: false, error: "Forbidden: Admin privileges required" };
  }

  const parsed = setGlobalFlagSchema.safeParse({ flagKey, enabled });
  if (!parsed.success) {
    return { success: false, error: "Invalid parameters" };
  }

  const res = await setGlobalFlagState(parsed.data.flagKey, parsed.data.enabled);

  if (res.success) {
    await recordAdminAuditEvent({
      adminUserId: sessionResult.value.user.id,
      action: "flag_global_toggle",
      metadata: { flagKey: parsed.data.flagKey, enabled: parsed.data.enabled },
    });
    revalidateTags([SETTINGS_TAG, ADMIN_OVERVIEW_TAG]);
  }

  return res;
}

/**
 * Admin action: Fetch all per-user overrides for display.
 */
export async function getAdminOverridesAction(
  flagKey?: string
): Promise<{
  success: boolean;
  overrides?: FeatureFlagAssignmentWithUser[];
  error?: string;
}> {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value) {
    return { success: false, error: "Unauthorized" };
  }

  if (!isAdmin(sessionResult.value.user)) {
    return { success: false, error: "Forbidden: Admin privileges required" };
  }

  const overrides = await getAdminFeatureFlagAssignments(flagKey);
  return { success: true, overrides };
}

/**
 * Admin action: Update the global AI provider used across the entire app.
 */
export async function setGlobalAiProviderAction(
  provider: GlobalAiProvider
): Promise<Result<{ provider: GlobalAiProvider }, string>> {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value) {
    return err("Unauthorized");
  }

  if (!isAdmin(sessionResult.value.user)) {
    return err("Forbidden: Admin privileges required");
  }

  const parsed = setGlobalAiProviderSchema.safeParse({ provider });
  if (!parsed.success) {
    return err("Invalid AI provider");
  }

  const updateRes = await setGlobalAiProvider(
    parsed.data.provider,
    sessionResult.value.user.id
  );
  if (!updateRes.ok) {
    return err(updateRes.error.message || "Failed to update global AI provider");
  }

  revalidateTags([ADMIN_OVERVIEW_TAG]);
  return ok(updateRes.value);
}
