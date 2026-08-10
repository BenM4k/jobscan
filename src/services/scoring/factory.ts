import "server-only";
import { ScoringProvider, AIProviderName } from "./types";
import { ClaudeProvider } from "./claude-provider";
import { GeminiProvider } from "./gemini-provider";
import { OpenAIProvider } from "./openai-provider";

export function getScoringProvider(providerName?: string): ScoringProvider {
  const selected = (providerName || process.env.AI_PROVIDER || "gemini").toLowerCase() as AIProviderName;

  switch (selected) {
    case "claude":
      return new ClaudeProvider();
    case "openai":
      return new OpenAIProvider();
    case "gemini":
    default:
      return new GeminiProvider();
  }
}
