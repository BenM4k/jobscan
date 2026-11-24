import "dotenv/config";
import {
  filterGoogleChatModels,
  getDefaultModelForProvider,
} from "@/services/ai/model-catalog";
import {
  isValidModelId,
  setGlobalAiProvider,
} from "@/services/ai/provider-config";
import { resolveLanguageModel } from "@/services/skills.service";
import { getScoringProvider } from "@/services/scoring/factory";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runAiModelConfigUnitTests() {
  console.log("Running AI Model Config & Catalog unit tests...");

  // 1. filterGoogleChatModels strips prefix, keeps generateContent Gemini models, filters non-chat variants
  const filtered = filterGoogleChatModels([
    {
      name: "models/gemini-2.5-flash",
      displayName: "Gemini 2.5 Flash",
      inputTokenLimit: 1048576,
      supportedGenerationMethods: ["generateContent", "countTokens"],
    },
    {
      name: "models/gemini-2.5-flash-preview-tts",
      displayName: "Gemini 2.5 Flash TTS",
      supportedGenerationMethods: ["generateContent"],
    },
    {
      name: "models/gemini-2.5-flash-image",
      displayName: "Nano Banana",
      supportedGenerationMethods: ["generateContent"],
    },
    {
      name: "models/gemini-embedding-001",
      displayName: "Embedding",
      supportedGenerationMethods: ["embedContent"],
    },
    {
      name: "models/gemma-4-31b-it",
      displayName: "Gemma 4",
      supportedGenerationMethods: ["generateContent"],
    },
    {
      name: "models/gemini-3-flash-preview",
      displayName: "Gemini 3 Flash Preview",
      supportedGenerationMethods: ["generateContent"],
    },
  ]);

  assert(
    filtered.length === 2,
    `Expected 2 Gemini chat models, got ${filtered.length}: ${filtered.map((m) => m.id).join(", ")}`
  );
  assert(
    filtered.some((m) => m.id === "gemini-2.5-flash" && m.source === "live"),
    "gemini-2.5-flash must be included with models/ prefix stripped"
  );
  assert(
    filtered.some((m) => m.id === "gemini-3-flash-preview"),
    "gemini-3-flash-preview must be included"
  );

  // 2. isValidModelId validation
  assert(isValidModelId("gemini-2.5-flash"), "Valid gemini model ID must pass");
  assert(
    isValidModelId("anthropic/claude-sonnet-4"),
    "Valid slash gateway model ID must pass"
  );
  assert(!isValidModelId(""), "Empty model ID must fail");
  assert(!isValidModelId("bad model name!"), "Spaces/symbols must fail");
  assert(!isValidModelId("x".repeat(121)), "Overly long model ID must fail");

  // 3. resolveLanguageModel & getScoringProvider respect explicit modelId overrides
  const prevGeminiKey = process.env.GEMINI_API_KEY;
  const prevAnthropicKey = process.env.ANTHROPIC_API_KEY;
  const prevOpenaiKey = process.env.OPENAI_API_KEY;
  process.env.GEMINI_API_KEY = "test-gemini-key";
  process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
  process.env.OPENAI_API_KEY = "test-openai-key";

  try {
    const g = resolveLanguageModel("gemini", "gemini-2.5-pro");
    assert(g.modelId === "gemini-2.5-pro", `Expected gemini-2.5-pro, got ${g.modelId}`);

    const c = resolveLanguageModel("claude", "claude-sonnet-4-20250514");
    assert(
      c.modelId === "claude-sonnet-4-20250514",
      `Expected claude-sonnet-4-20250514, got ${c.modelId}`
    );

    const o = resolveLanguageModel("openai", "gpt-4.1-mini");
    assert(o.modelId === "gpt-4.1-mini", `Expected gpt-4.1-mini, got ${o.modelId}`);

    const gw = resolveLanguageModel("gateway", "google/gemini-2.5-flash");
    assert(
      gw.modelId === "google/gemini-2.5-flash",
      `Expected google/gemini-2.5-flash, got ${gw.modelId}`
    );

    assert(
      getScoringProvider("gemini", "gemini-2.5-pro").modelId === "gemini-2.5-pro",
      "GeminiProvider must use explicit modelId"
    );
    assert(
      getScoringProvider("claude", "claude-3-7-sonnet-latest").modelId ===
        "claude-3-7-sonnet-latest",
      "ClaudeProvider must use explicit modelId"
    );
    assert(
      getScoringProvider("openai", "gpt-4.1").modelId === "gpt-4.1",
      "OpenAIProvider must use explicit modelId"
    );
    assert(
      getScoringProvider("gateway", "openai/gpt-4o-mini").modelId ===
        "openai/gpt-4o-mini",
      "GatewayProvider must use explicit modelId"
    );

    assert(
      typeof getDefaultModelForProvider("gemini") === "string" &&
        getDefaultModelForProvider("gemini").length > 0,
      "getDefaultModelForProvider('gemini') must return non-empty fallback"
    );
  } finally {
    if (prevGeminiKey !== undefined) process.env.GEMINI_API_KEY = prevGeminiKey;
    else delete process.env.GEMINI_API_KEY;
    if (prevAnthropicKey !== undefined) process.env.ANTHROPIC_API_KEY = prevAnthropicKey;
    else delete process.env.ANTHROPIC_API_KEY;
    if (prevOpenaiKey !== undefined) process.env.OPENAI_API_KEY = prevOpenaiKey;
    else delete process.env.OPENAI_API_KEY;
  }

  // 4. setGlobalAiProvider rejects invalid model IDs immediately
  const invalidModelRes = await setGlobalAiProvider(
    "gemini",
    "admin-test-id",
    "bad model spaces"
  );
  assert(
    !invalidModelRes.ok && invalidModelRes.error.code === "VALIDATION_ERROR",
    "setGlobalAiProvider must reject malformed model IDs"
  );

  console.log("✓ AI Model Config & Catalog unit tests passed!");
}

runAiModelConfigUnitTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
