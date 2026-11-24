"use server";

import { requireSession } from "@/lib/auth-guard";
import { FEATURE_FLAGS, setUserFeatureFlagOverride } from "@/services/flags";
import { isAdmin } from "@/services/auth/admin";
import { hasProAccess } from "@/services/billing/billing.service";
import * as billingDal from "@/dal/billing.dal";
import * as growthDal from "@/dal/growth.dal";
import { z } from "zod";
import { SETTINGS_TAG, revalidateTags } from "@/lib/cache-tags";

const PRO_ONLY_FLAGS = new Set<string>([
  FEATURE_FLAGS.HYBRID_SCORING,
  FEATURE_FLAGS.HYBRID_SCORING_V1,
]);

const USER_SELF_SERVICE_FLAGS = new Set<string>([FEATURE_FLAGS.NEW_ADAPTERS]);

const flagOverrideSchema = z.object({
  flagKey: z.string().min(1).max(100),
  enabled: z.boolean().nullable(),
});

const digestSettingsSchema = z.object({
  digestEmailEnabled: z.boolean(),
  digestEmailFrequency: z.enum(["daily", "weekly"]),
});

export async function setFeatureFlagOverrideAction(
  flagKey: string,
  enabled: boolean | null
): Promise<{ success: boolean; error?: string }> {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value) {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = flagOverrideSchema.safeParse({ flagKey, enabled });
  if (!parsed.success) {
    return { success: false, error: "Invalid parameters" };
  }

  const user = sessionResult.value.user;
  const userId = user.id;

  if (!isAdmin(user)) {
    if (PRO_ONLY_FLAGS.has(parsed.data.flagKey)) {
      if (parsed.data.enabled === true) {
        const subRes = await billingDal.getUserSubscription(userId);
        if (!subRes.ok || !hasProAccess(subRes.value)) {
          return {
            success: false,
            error: "This feature requires an active Jobpilot Pro subscription.",
          };
        }
      }
    } else if (!USER_SELF_SERVICE_FLAGS.has(parsed.data.flagKey)) {
      return {
        success: false,
        error: "You do not have permission to modify this feature flag.",
      };
    }
  }

  const res = await setUserFeatureFlagOverride(
    userId,
    parsed.data.flagKey,
    parsed.data.enabled
  );

  if (res.success) {
    revalidateTags(SETTINGS_TAG);
  }

  return res;
}

export async function updateDigestPreferencesAction(
  digestEmailEnabled: boolean,
  digestEmailFrequency: "daily" | "weekly"
): Promise<{ success: boolean; error?: string }> {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value) {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = digestSettingsSchema.safeParse({
    digestEmailEnabled,
    digestEmailFrequency,
  });
  if (!parsed.success) {
    return { success: false, error: "Invalid settings parameters" };
  }

  const user = sessionResult.value.user;
  if (parsed.data.digestEmailFrequency === "daily" && !isAdmin(user)) {
    const subRes = await billingDal.getUserSubscription(user.id);
    if (!subRes.ok || !hasProAccess(subRes.value)) {
      return {
        success: false,
        error: "Daily opportunity digests require an active Jobpilot Pro subscription.",
      };
    }
  }

  const res = await growthDal.upsertUserPreferences(user.id, parsed.data);

  if (!res.ok) {
    return { success: false, error: res.error.message };
  }

  revalidateTags(SETTINGS_TAG);
  return { success: true };
}
