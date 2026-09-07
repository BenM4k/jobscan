"use server";

import { requireSession } from "@/lib/auth-guard";
import { setUserFeatureFlagOverride } from "@/services/flags";
import * as growthDal from "@/dal/growth.dal";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const flagOverrideSchema = z.object({
  flagKey: z.string().min(1),
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

  const res = await setUserFeatureFlagOverride(
    sessionResult.value.user.id,
    parsed.data.flagKey,
    parsed.data.enabled
  );

  if (res.success) {
    revalidatePath("/dashboard/settings");
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

  const res = await growthDal.upsertUserPreferences(
    sessionResult.value.user.id,
    parsed.data
  );

  if (!res.ok) {
    return { success: false, error: res.error.message };
  }

  revalidatePath("/dashboard/settings");
  return { success: true };
}
