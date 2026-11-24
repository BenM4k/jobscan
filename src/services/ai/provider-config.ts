import "server-only";

import * as opsDal from "@/dal/ops.dal";
import { cacheDel, cacheGet, cacheSet } from "@/services/cache/redis-client";
import { resolveLanguageModel } from "@/services/skills.service";
import { ok, err, type Result } from "@/lib/result";
import { AppError } from "@/lib/errors";

export const SUPPORTED_AI_PROVIDERS = [
  "gemini",
  "claude",
  "openai",
  "gateway",
] as const;

export type GlobalAiProvider = (typeof SUPPORTED_AI_PROVIDERS)[number];

export const DEFAULT_AI_PROVIDER: GlobalAiProvider = "gemini";

const AI_PROVIDER_SETTING_KEY = "ai_provider";
const AI_PROVIDER_CACHE_KEY = "app:setting:ai_provider";
const AI_PROVIDER_CACHE_TTL_SEC = 60;

function isSupportedAiProvider(val: string | null | undefined): val is GlobalAiProvider {
  return Boolean(val && (SUPPORTED_AI_PROVIDERS as readonly string[]).includes(val));
}

/** Reports which AI providers have credentials present in server env (booleans only). */
export function getConfiguredAiProviders(): Record<GlobalAiProvider, boolean> {
  return {
    gemini: Boolean(
      process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
    ),
    claude: Boolean(process.env.ANTHROPIC_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    gateway: Boolean(
      process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN
    ),
  };
}

/**
 * Resolves the admin-configured global AI provider (defaulting to Gemini).
 * Checks 60s Redis cache -> DB `app_setting` -> env `AI_PROVIDER` -> `"gemini"`.
 */
export async function getGlobalAiProvider(): Promise<GlobalAiProvider> {
  try {
    const cached = await cacheGet<string>(AI_PROVIDER_CACHE_KEY);
    if (isSupportedAiProvider(cached)) {
      return cached;
    }

    const dbRes = await opsDal.getAppSetting(AI_PROVIDER_SETTING_KEY);
    if (dbRes.ok && isSupportedAiProvider(dbRes.value)) {
      await cacheSet(AI_PROVIDER_CACHE_KEY, dbRes.value, AI_PROVIDER_CACHE_TTL_SEC);
      return dbRes.value;
    }
  } catch {
    // Offline/build/test fallback: safely default to env/Gemini.
  }

  const envProvider = process.env.AI_PROVIDER?.trim().toLowerCase();
  return isSupportedAiProvider(envProvider) ? envProvider : DEFAULT_AI_PROVIDER;
}

/** Updates the global AI provider in Postgres, invalidates cache, and writes admin audit log. */
export async function setGlobalAiProvider(
  provider: GlobalAiProvider,
  adminUserId: string
): Promise<Result<{ provider: GlobalAiProvider }, AppError>> {
  if (!isSupportedAiProvider(provider)) {
    return err(new AppError("VALIDATION_ERROR", "Unsupported AI provider selected"));
  }

  const upsertRes = await opsDal.upsertAppSetting(
    AI_PROVIDER_SETTING_KEY,
    provider,
    adminUserId
  );
  if (!upsertRes.ok) {
    return err(upsertRes.error);
  }

  await cacheDel(AI_PROVIDER_CACHE_KEY);

  const { recordAdminAuditEvent } = await import("@/services/admin/admin.service");
  await recordAdminAuditEvent({
    adminUserId,
    action: "ai_provider_change",
    metadata: { provider },
  });

  return ok({ provider });
}

/** Returns the Vercel AI SDK model instance + metadata for the admin-selected global provider. */
export async function getActiveLanguageModel() {
  const activeProvider = await getGlobalAiProvider();
  return resolveLanguageModel(activeProvider);
}
