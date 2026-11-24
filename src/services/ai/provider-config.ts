import "server-only";

import * as opsDal from "@/dal/ops.dal";
import { cacheDel, cacheGet, cacheSet } from "@/services/cache/redis-client";
import { resolveLanguageModel } from "@/services/skills.service";
import { getDefaultModelForProvider } from "./model-catalog";
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
const AI_MODEL_SETTING_PREFIX = "ai_model:";
const AI_MODEL_CACHE_PREFIX = "app:setting:ai_model:";
const AI_PROVIDER_CACHE_TTL_SEC = 60;
const MODEL_ID_REGEX = /^[a-zA-Z0-9._:/-]+$/;

export function isValidModelId(val: string | null | undefined): val is string {
  if (typeof val !== "string") return false;
  const trimmed = val.trim();
  return (
    trimmed.length >= 1 && trimmed.length <= 120 && MODEL_ID_REGEX.test(trimmed)
  );
}

function isSupportedAiProvider(
  val: string | null | undefined,
): val is GlobalAiProvider {
  return Boolean(
    val && (SUPPORTED_AI_PROVIDERS as readonly string[]).includes(val),
  );
}

/** Reports which AI providers have credentials present in server env (booleans only). */
export function getConfiguredAiProviders(): Record<GlobalAiProvider, boolean> {
  return {
    gemini: Boolean(
      process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    ),
    claude: Boolean(process.env.ANTHROPIC_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    gateway: Boolean(
      process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN,
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
      await cacheSet(
        AI_PROVIDER_CACHE_KEY,
        dbRes.value,
        AI_PROVIDER_CACHE_TTL_SEC,
      );
      return dbRes.value;
    }
  } catch {
    // Offline/build/test fallback: safely default to env/Gemini.
  }

  const envProvider = process.env.AI_PROVIDER?.trim().toLowerCase();
  return isSupportedAiProvider(envProvider) ? envProvider : DEFAULT_AI_PROVIDER;
}

/**
 * Resolves the admin-configured model ID for a provider.
 * Checks 60s Redis cache -> DB `app_setting` (`ai_model:<provider>`) -> provider env/default.
 */
export async function getGlobalAiModel(
  provider: GlobalAiProvider,
): Promise<string> {
  const settingKey = `${AI_MODEL_SETTING_PREFIX}${provider}`;
  const cacheKey = `${AI_MODEL_CACHE_PREFIX}${provider}`;

  try {
    const cached = await cacheGet<string>(cacheKey);
    if (isValidModelId(cached)) {
      return cached.trim();
    }

    const dbRes = await opsDal.getAppSetting(settingKey);
    if (dbRes.ok && isValidModelId(dbRes.value)) {
      const normalized = dbRes.value.trim();
      await cacheSet(cacheKey, normalized, AI_PROVIDER_CACHE_TTL_SEC);
      return normalized;
    }
  } catch {
    // Offline/build/test fallback
  }

  return getDefaultModelForProvider(provider);
}

/** Returns the active global AI provider, its active model ID, and saved models per provider. */
export async function getGlobalAiConfig(): Promise<{
  provider: GlobalAiProvider;
  modelId: string;
  modelsByProvider: Record<GlobalAiProvider, string>;
}> {
  const [provider, geminiModel, claudeModel, openaiModel, gatewayModel] =
    await Promise.all([
      getGlobalAiProvider(),
      getGlobalAiModel("gemini"),
      getGlobalAiModel("claude"),
      getGlobalAiModel("openai"),
      getGlobalAiModel("gateway"),
    ]);

  const modelsByProvider: Record<GlobalAiProvider, string> = {
    gemini: geminiModel,
    claude: claudeModel,
    openai: openaiModel,
    gateway: gatewayModel,
  };

  return {
    provider,
    modelId: modelsByProvider[provider],
    modelsByProvider,
  };
}

/** Updates the global AI provider (and optional model ID) in Postgres, invalidates cache, and writes audit log. */
export async function setGlobalAiProvider(
  provider: GlobalAiProvider,
  adminUserId: string,
  modelId?: string,
): Promise<Result<{ provider: GlobalAiProvider; modelId: string }, AppError>> {
  if (!isSupportedAiProvider(provider)) {
    return err(
      new AppError("VALIDATION_ERROR", "Unsupported AI provider selected"),
    );
  }

  if (modelId !== undefined && !isValidModelId(modelId)) {
    return err(new AppError("VALIDATION_ERROR", "Invalid AI model identifier"));
  }

  const configured = getConfiguredAiProviders();
  if (!configured[provider]) {
    return err(
      new AppError(
        "VALIDATION_ERROR",
        `Cannot activate "${provider}": required server credentials are not configured.`,
      ),
    );
  }

  const upsertRes = await opsDal.upsertAppSetting(
    AI_PROVIDER_SETTING_KEY,
    provider,
    adminUserId,
  );
  if (!upsertRes.ok) {
    return err(upsertRes.error);
  }

  await cacheDel(AI_PROVIDER_CACHE_KEY);

  let resolvedModelId: string;
  if (modelId !== undefined) {
    const trimmedModel = modelId.trim();
    const modelUpsertRes = await opsDal.upsertAppSetting(
      `${AI_MODEL_SETTING_PREFIX}${provider}`,
      trimmedModel,
      adminUserId,
    );
    if (!modelUpsertRes.ok) {
      return err(modelUpsertRes.error);
    }
    await cacheDel(`${AI_MODEL_CACHE_PREFIX}${provider}`);
    resolvedModelId = trimmedModel;
  } else {
    resolvedModelId = await getGlobalAiModel(provider);
  }

  const { recordAdminAuditEvent } =
    await import("@/services/admin/admin.service");
  await recordAdminAuditEvent({
    adminUserId,
    action: "ai_provider_change",
    metadata: { provider, modelId: resolvedModelId },
  });

  return ok({ provider, modelId: resolvedModelId });
}

/** Updates both the global AI provider and its model ID atomically in sequence. */
export async function setGlobalAiConfig(
  params: { provider: GlobalAiProvider; modelId?: string },
  adminUserId: string,
): Promise<Result<{ provider: GlobalAiProvider; modelId: string }, AppError>> {
  return setGlobalAiProvider(params.provider, adminUserId, params.modelId);
}

/** Returns the Vercel AI SDK model instance + metadata for the admin-selected global provider & model. */
export async function getActiveLanguageModel() {
  const activeProvider = await getGlobalAiProvider();
  const activeModelId = await getGlobalAiModel(activeProvider);
  return resolveLanguageModel(activeProvider, activeModelId);
}
