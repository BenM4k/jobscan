import "server-only";
import * as opsDal from "@/dal/ops.dal";
import type { AiFeature } from "@/dal/ops.dal";

export interface AiCostTrackingContext {
  userId?: string | null;
  feature: AiFeature;
  provider?: string;
  model?: string;
  costEstimateUsd?: string | null;
  cacheHit?: boolean;
}

/**
 * Pricing rates per 1,000,000 tokens (input, output) in USD.
 *
 * NOTE: Google's introductory pricing for gemini-3.7-flash ($0.75 input, $3.75 output)
 * expires Dec 31, 2026. After that date, rates double to $1.50 input, $7.50 output.
 * gemini-embedding-2 is priced at $0.20/1M input, $0 output.
 */
function getGeminiFlashPricing(): { input: number; output: number } {
  const isPost2026 = new Date() >= new Date("2027-01-01T00:00:00Z");
  return isPost2026
    ? { input: 1.5, output: 7.5 }
    : { input: 0.75, output: 3.75 };
}

export const MODEL_PRICING_PER_MILLION: Record<
  string,
  { input: number; output: number } | (() => { input: number; output: number })
> = {
  "gemini-3.8-flash": getGeminiFlashPricing,
  "gemini-3.7-flash": getGeminiFlashPricing,
  "gemini-3.6-flash": getGeminiFlashPricing,
  "gemini-embedding-2": { input: 0.2, output: 0.0 },
  "text-embedding-3-small": { input: 0.02, output: 0.0 },
  "claude-3-5-sonnet-latest": { input: 3.0, output: 15.0 },
  "claude-3-5-sonnet": { input: 3.0, output: 15.0 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 2.5, output: 10.0 },
};

/**
 * Calculates USD cost estimate based on token counts and model pricing.
 */
export function calculateEstimatedCost(
  model: string,
  inputTokens?: number | null,
  outputTokens?: number | null
): string | undefined {
  if (inputTokens == null && outputTokens == null) {
    return undefined;
  }

  const matchingKeys = Object.keys(MODEL_PRICING_PER_MILLION).filter((key) =>
    model.toLowerCase().includes(key.toLowerCase())
  );
  // Match the longest key (e.g. "gpt-4o-mini" over "gpt-4o")
  const normalizedModel = matchingKeys.sort((a, b) => b.length - a.length)[0];
  const rawPricing = normalizedModel
    ? MODEL_PRICING_PER_MILLION[normalizedModel]
    : { input: 1.0, output: 3.0 }; // conservative default fallback
  const pricing =
    typeof rawPricing === "function" ? rawPricing() : rawPricing;

  const inputCost = (((inputTokens ?? 0)) / 1_000_000) * pricing.input;
  const outputCost = (((outputTokens ?? 0)) / 1_000_000) * pricing.output;
  const total = inputCost + outputCost;

  return total > 0 ? total.toFixed(6) : "0.000000";
}

/**
 * Step 17 Function 1: Direct insert into ai_call_log.
 * Used for cache-hit branches with null/zero token counts or manual audit entries.
 */
export async function logAiCall(params: {
  userId?: string | null;
  feature: AiFeature;
  provider: string;
  model: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  costEstimateUsd?: string | null;
  cacheHit?: boolean;
}): Promise<void> {
  try {
    await opsDal.logAiCall({
      userId: params.userId ?? null,
      feature: params.feature,
      provider: params.provider,
      model: params.model,
      inputTokens: params.inputTokens ?? null,
      outputTokens: params.outputTokens ?? null,
      costEstimateUsd: params.costEstimateUsd ?? null,
      cacheHit: params.cacheHit ?? false,
    });
  } catch (err) {
    console.warn("[withCostTracking] Direct logAiCall failed:", err);
  }
}

/**
 * Step 17 Function 2: Wraps a real AI provider call, extracts token usage,
 * estimates cost, logs to ai_call_log, and returns the result.
 */
export async function withCostTracking<T>(
  ctx: AiCostTrackingContext,
  aiCallFn: () => Promise<T>
): Promise<T> {
  const result = await aiCallFn();

  try {
    let inputTokens: number | null | undefined;
    let outputTokens: number | null | undefined;
    let model = ctx.model || "unknown";
    const provider = ctx.provider || "ai";

    if (result && typeof result === "object") {
      let res = result as Record<string, unknown>;
      if (res.ok === true && res.value && typeof res.value === "object") {
        res = res.value as Record<string, unknown>;
      }

      // 1. Check for ScoringProvider pattern (_usage: ScoreUsage)
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
      // 2. Check for Vercel AI SDK generateText pattern (usage: LanguageModelUsage)
      else if (res.usage && typeof res.usage === "object") {
        const usage = res.usage as Record<string, unknown>;
        if (typeof usage.inputTokens === "number") {
          inputTokens = usage.inputTokens;
        }
        if (typeof usage.outputTokens === "number") {
          outputTokens = usage.outputTokens;
        }
        // 3. Check for Vercel AI SDK embed pattern (usage: { tokens: number })
        if (typeof usage.tokens === "number" && !Number.isNaN(usage.tokens)) {
          inputTokens = usage.tokens;
          outputTokens = 0;
        }
      }
    }

    const costEstimateUsd =
      ctx.costEstimateUsd ??
      calculateEstimatedCost(model, inputTokens, outputTokens);

    await logAiCall({
      userId: ctx.userId ?? null,
      feature: ctx.feature,
      provider,
      model,
      inputTokens,
      outputTokens,
      costEstimateUsd,
      cacheHit: ctx.cacheHit ?? false,
    });
  } catch (logErr) {
    // Telemetry logging errors must never fail the main AI workflow
    console.warn("[withCostTracking] Failed to record AI call metric:", logErr);
  }

  return result;
}

// Backward-compatibility alias
export const withAiTracking = withCostTracking;
