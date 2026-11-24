import "server-only";

import { cacheDel, cacheGet, cacheSet } from "@/services/cache/redis-client";
import type { GlobalAiProvider } from "./provider-config";

export interface AiModelOption {
  id: string;
  displayName: string;
  description?: string;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
  source: "live" | "fallback";
}

export interface ProviderModelCatalog {
  provider: GlobalAiProvider;
  models: AiModelOption[];
  source: "live" | "fallback";
}

export interface GoogleRawModel {
  name?: string;
  displayName?: string;
  description?: string;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
  supportedGenerationMethods?: string[];
}

const MODELS_CACHE_PREFIX = "app:ai:models:";
const MODELS_CACHE_TTL_SEC = 900; // 15 minutes
const DISCOVERY_TIMEOUT_MS = 6000;

const EXCLUDED_GOOGLE_PATTERNS =
  /(-tts|-image|-audio|-live|computer-use|deep-research|robotics|exp-image|vision|embedding|aqa)/i;

const FALLBACK_MODELS: Record<GlobalAiProvider, Omit<AiModelOption, "source">[]> = {
  gemini: [
    {
      id: "gemini-2.5-flash",
      displayName: "Gemini 2.5 Flash",
      description: "Fast, well-rounded reasoning and structured output.",
    },
    {
      id: "gemini-2.5-pro",
      displayName: "Gemini 2.5 Pro",
      description: "Higher capability model for complex tailoring and analysis.",
    },
    {
      id: "gemini-2.5-flash-lite",
      displayName: "Gemini 2.5 Flash-Lite",
      description: "Ultra-fast, lowest-cost Gemini model.",
    },
    {
      id: "gemini-flash-latest",
      displayName: "Gemini Flash Latest",
      description: "Google-managed alias for the latest Flash release.",
    },
    {
      id: "gemini-pro-latest",
      displayName: "Gemini Pro Latest",
      description: "Google-managed alias for the latest Pro release.",
    },
  ],
  claude: [
    {
      id: "claude-sonnet-4-20250514",
      displayName: "Claude Sonnet 4",
      description: "Balanced frontier coding and structured writing.",
    },
    {
      id: "claude-3-7-sonnet-latest",
      displayName: "Claude 3.7 Sonnet",
      description: "Strong reasoning and nuanced resume/cover letter copy.",
    },
    {
      id: "claude-3-5-sonnet-latest",
      displayName: "Claude 3.5 Sonnet",
      description: "Proven default Anthropic model.",
    },
    {
      id: "claude-3-5-haiku-latest",
      displayName: "Claude 3.5 Haiku",
      description: "Fast, low-cost Anthropic model.",
    },
  ],
  openai: [
    {
      id: "gpt-4o",
      displayName: "GPT-4o",
      description: "Versatile multimodal flagship model.",
    },
    {
      id: "gpt-4o-mini",
      displayName: "GPT-4o mini",
      description: "Fast, cost-efficient model for structured tasks.",
    },
    {
      id: "gpt-4.1",
      displayName: "GPT-4.1",
      description: "High-precision instruction following.",
    },
    {
      id: "gpt-4.1-mini",
      displayName: "GPT-4.1 mini",
      description: "Lightweight, high-speed GPT-4.1 variant.",
    },
  ],
  gateway: [
    {
      id: "google/gemini-2.5-flash",
      displayName: "Google Gemini 2.5 Flash (Gateway)",
    },
    {
      id: "google/gemini-2.5-pro",
      displayName: "Google Gemini 2.5 Pro (Gateway)",
    },
    {
      id: "openai/gpt-4o",
      displayName: "OpenAI GPT-4o (Gateway)",
    },
    {
      id: "openai/gpt-4o-mini",
      displayName: "OpenAI GPT-4o mini (Gateway)",
    },
    {
      id: "anthropic/claude-sonnet-4",
      displayName: "Anthropic Claude Sonnet 4 (Gateway)",
    },
  ],
};

/** Returns the fallback/default model ID for a given AI provider. */
export function getDefaultModelForProvider(provider: GlobalAiProvider): string {
  switch (provider) {
    case "gemini":
      return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
    case "claude":
      return process.env.ANTHROPIC_MODEL?.trim() || "claude-3-5-sonnet-latest";
    case "openai":
      return process.env.OPENAI_MODEL?.trim() || "gpt-4o";
    case "gateway":
      return process.env.AI_GATEWAY_MODEL?.trim() || "openai/gpt-4o";
  }
}

function getFallbackCatalog(provider: GlobalAiProvider): ProviderModelCatalog {
  const models: AiModelOption[] = FALLBACK_MODELS[provider].map((m) => ({
    ...m,
    source: "fallback",
  }));
  const defaultId = getDefaultModelForProvider(provider);
  if (defaultId && !models.some((m) => m.id === defaultId)) {
    models.unshift({
      id: defaultId,
      displayName: defaultId,
      description: "Configured environment default.",
      source: "fallback",
    });
  }
  return { provider, models, source: "fallback" };
}

function scoreGoogleModelRank(id: string): number {
  const lower = id.toLowerCase();
  let score = 0;
  if (/^gemini-3/.test(lower)) score += 300;
  else if (/^gemini-2\.5/.test(lower)) score += 250;
  else if (/^gemini-(flash|pro|flash-lite)-latest$/.test(lower)) score += 220;
  else if (/^gemini-2\.0/.test(lower)) score += 150;
  else if (/^gemini-1\.5/.test(lower)) score += 100;

  if (!lower.includes("preview") && !lower.includes("-exp")) score += 40;
  if (lower.includes("flash")) score += 20;
  else if (lower.includes("pro")) score += 15;
  return score;
}

/** Filters and normalizes Google `v1beta/models` results for text & structured output use. */
export function filterGoogleChatModels(rawModels: GoogleRawModel[]): AiModelOption[] {
  const deduped = new Map<string, AiModelOption>();

  for (const raw of rawModels) {
    if (
      !Array.isArray(raw.supportedGenerationMethods) ||
      !raw.supportedGenerationMethods.includes("generateContent")
    ) {
      continue;
    }

    const id = (raw.name || "").replace(/^models\//, "").trim();
    if (!id || !/^gemini-/i.test(id) || EXCLUDED_GOOGLE_PATTERNS.test(id)) {
      continue;
    }

    if (!deduped.has(id)) {
      deduped.set(id, {
        id,
        displayName: raw.displayName?.trim() || id,
        description: raw.description?.trim(),
        inputTokenLimit: raw.inputTokenLimit,
        outputTokenLimit: raw.outputTokenLimit,
        source: "live",
      });
    }
  }

  return Array.from(deduped.values()).sort((a, b) => {
    const rankDiff = scoreGoogleModelRank(b.id) - scoreGoogleModelRank(a.id);
    if (rankDiff !== 0) return rankDiff;
    return b.id.localeCompare(a.id);
  });
}

async function fetchLiveGeminiModels(): Promise<AiModelOption[] | null> {
  const apiKey =
    process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return null;

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models?pageSize=100",
    {
      headers: { "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(DISCOVERY_TIMEOUT_MS),
    }
  );
  if (!res.ok) return null;

  const payload = (await res.json()) as { models?: GoogleRawModel[] };
  const filtered = filterGoogleChatModels(payload.models || []);
  return filtered.length > 0 ? filtered : null;
}

async function fetchLiveClaudeModels(): Promise<AiModelOption[] | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const res = await fetch("https://api.anthropic.com/v1/models", {
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    signal: AbortSignal.timeout(DISCOVERY_TIMEOUT_MS),
  });
  if (!res.ok) return null;

  const payload = (await res.json()) as {
    data?: Array<{ id?: string; display_name?: string }>;
  };
  const models: AiModelOption[] = (payload.data || [])
    .filter((m): m is { id: string; display_name?: string } => Boolean(m.id))
    .map((m) => ({
      id: m.id,
      displayName: m.display_name?.trim() || m.id,
      source: "live" as const,
    }));

  return models.length > 0 ? models : null;
}

async function fetchLiveOpenAiModels(): Promise<AiModelOption[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const res = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(DISCOVERY_TIMEOUT_MS),
  });
  if (!res.ok) return null;

  const payload = (await res.json()) as { data?: Array<{ id?: string }> };
  const chatRegex = /^(gpt-4|gpt-5|o1|o3|o4)/i;
  const excludeRegex = /(audio|realtime|transcribe|tts|search|image)/i;

  const models: AiModelOption[] = (payload.data || [])
    .map((m) => m.id?.trim() || "")
    .filter((id) => Boolean(id) && chatRegex.test(id) && !excludeRegex.test(id))
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 30)
    .map((id) => ({
      id,
      displayName: id,
      source: "live" as const,
    }));

  return models.length > 0 ? models : null;
}

/**
 * Lists selectable models for an AI provider, checking Redis first and falling back
 * safely to curated defaults when live discovery is unconfigured or offline.
 */
export async function listModelsForProvider(
  provider: GlobalAiProvider,
  options?: { forceRefresh?: boolean }
): Promise<ProviderModelCatalog> {
  const cacheKey = `${MODELS_CACHE_PREFIX}${provider}`;

  if (!options?.forceRefresh) {
    try {
      const cached = await cacheGet<ProviderModelCatalog>(cacheKey);
      if (cached && Array.isArray(cached.models) && cached.models.length > 0) {
        return cached;
      }
    } catch {
      // Cache unavailable; proceed to live discovery
    }
  } else {
    await cacheDel(cacheKey).catch(() => undefined);
  }

  let liveModels: AiModelOption[] | null = null;
  try {
    if (provider === "gemini") {
      liveModels = await fetchLiveGeminiModels();
    } else if (provider === "claude") {
      liveModels = await fetchLiveClaudeModels();
    } else if (provider === "openai") {
      liveModels = await fetchLiveOpenAiModels();
    }
  } catch {
    liveModels = null;
  }

  if (liveModels && liveModels.length > 0) {
    const catalog: ProviderModelCatalog = {
      provider,
      models: liveModels,
      source: "live",
    };
    await cacheSet(cacheKey, catalog, MODELS_CACHE_TTL_SEC).catch(
      () => undefined
    );
    return catalog;
  }

  return getFallbackCatalog(provider);
}
