import "server-only";
import * as opsDal from "@/dal/ops.dal";
import type { AiFeature } from "@/dal/ops.dal";

export interface AiTrackerContext {
  userId: string;
  feature: AiFeature;
  provider?: string;
  model?: string;
  costEstimateUsd?: string;
  cacheHit?: boolean;
}

function getGeminiFlashPricing(): { input: number; output: number } {
  const isPost2026 = new Date() >= new Date("2027-01-01T00:00:00Z");
  return isPost2026
    ? { input: 1.5, output: 7.5 }
    : { input: 0.75, output: 3.75 };
}

/**
 * Rates per 1,000,000 tokens (input, output) in USD for popular models.
 */
const MODEL_PRICING_PER_MILLION: Record<
  string,
  { input: number; output: number } | (() => { input: number; output: number })
> = {
  "gemini-3.8-flash": getGeminiFlashPricing,
  "gemini-3.7-flash": getGeminiFlashPricing,
  "gemini-3.6-flash": getGeminiFlashPricing,
  "claude-3-5-sonnet-latest": { input: 3.0, output: 15.0 },
  "claude-3-5-sonnet": { input: 3.0, output: 15.0 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 2.5, output: 10.0 },
};

/**
 * Estimates USD cost based on token counts and model pricing.
 */
export function calculateEstimatedCost(
  model: string,
  inputTokens?: number,
  outputTokens?: number,
): string | undefined {
  if (inputTokens == null && outputTokens == null) {
    return undefined;
  }

  const matchingKeys = Object.keys(MODEL_PRICING_PER_MILLION).filter((key) =>
    model.toLowerCase().includes(key.toLowerCase()),
  );
  // Select the longest matching key (e.g. "gpt-4o-mini" over "gpt-4o")
  const normalizedModel = matchingKeys.sort((a, b) => b.length - a.length)[0];
  const rawPricing = normalizedModel
    ? MODEL_PRICING_PER_MILLION[normalizedModel]
    : { input: 1.0, output: 3.0 }; // conservative default fallback
  const pricing =
    typeof rawPricing === "function" ? rawPricing() : rawPricing;

  const inputCost = ((inputTokens || 0) / 1_000_000) * pricing.input;
  const outputCost = ((outputTokens || 0) / 1_000_000) * pricing.output;
  const total = inputCost + outputCost;

  return total > 0 ? total.toFixed(6) : "0.000000";
}

/**
 * Middleware / Decorator that wraps an AI provider call and automatically
 * extracts token usage and records an aiCallLog entry.
 */
export async function withAiTracking<T>(
  ctx: AiTrackerContext,
  aiCallFn: () => Promise<T>,
): Promise<T> {
  const result = await aiCallFn();

  try {
    let inputTokens: number | undefined;
    let outputTokens: number | undefined;
    let model = ctx.model || "unknown";
    const provider = ctx.provider || "ai";

    if (result && typeof result === "object") {
      let res = result as Record<string, unknown>;
      if (res.ok === true && res.value && typeof res.value === "object") {
        res = res.value as Record<string, unknown>;
      }

      // Check for _usage (ScoringProvider pattern)
      if (res._usage && typeof res._usage === "object") {
        const usage = res._usage as {
          inputTokens?: number;
          outputTokens?: number;
          modelId?: string;
        };
        inputTokens = usage.inputTokens;
        outputTokens = usage.outputTokens;
        if (usage.modelId) model = usage.modelId;
      }
      // Check for usage (Vercel AI SDK generateText result pattern)
      else if (res.usage && typeof res.usage === "object") {
        const usage = res.usage as {
          inputTokens?: number;
          outputTokens?: number;
        };
        inputTokens = usage.inputTokens;
        outputTokens = usage.outputTokens;
      }
    }

    const costEstimateUsd =
      ctx.costEstimateUsd ??
      calculateEstimatedCost(model, inputTokens, outputTokens);

    await opsDal.logAiCall({
      userId: ctx.userId,
      feature: ctx.feature,
      provider,
      model,
      inputTokens,
      outputTokens,
      costEstimateUsd,
      cacheHit: ctx.cacheHit ?? false,
    });
  } catch (logErr) {
    // Never fail the primary AI request due to telemetry logging errors
    console.warn("[AiTracker] Failed to record AI call metric:", logErr);
  }

  return result;
}
