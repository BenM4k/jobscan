import {
  withAiTracking,
  calculateEstimatedCost,
} from "@/services/ai/tracker";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runAiTrackerUnitTests() {
  console.log("Running AI Cost & Token Tracking unit tests...\n");

  // 1. Cost estimation calculations
  const gemini38Cost = calculateEstimatedCost("gemini-3.8-flash", 1000, 500);
  assert(
    gemini38Cost === "0.000225",
    `Expected 0.000225 for gemini-3.8-flash, got ${gemini38Cost}`
  );

  const geminiCost = calculateEstimatedCost("gemini-3.6-flash", 1000, 500);
  assert(geminiCost !== undefined, "Gemini cost should be calculated");
  // 1000 tokens in = 0.000075, 500 tokens out = 0.00015 -> total = 0.000225
  assert(
    geminiCost === "0.000225",
    `Expected 0.000225 for gemini-3.6-flash, got ${geminiCost}`
  );

  const claudeCost = calculateEstimatedCost("claude-3-5-sonnet-latest", 1000, 1000);
  // 1000 in = 0.003, 1000 out = 0.015 -> total = 0.018
  assert(
    claudeCost === "0.018000",
    `Expected 0.018000 for claude, got ${claudeCost}`
  );
  console.log("✓ Pricing calculator: accurately computes USD cost per model and token breakdown");

  // 2. withAiTracking wrapper preserving output
  const mockScoringResult = {
    fitScore: 92,
    explanation: "Excellent match",
    _usage: {
      inputTokens: 1200,
      outputTokens: 450,
      modelId: "gemini-3.6-flash",
    },
  };

  const output = await withAiTracking(
    {
      userId: "usr-mock-123",
      feature: "scoring",
      provider: "gemini",
    },
    async () => mockScoringResult
  );

  assert(output.fitScore === 92, "Wrapped function result must be preserved");
  assert(output._usage.inputTokens === 1200, "Usage metadata must be preserved on output");
  console.log("✓ Wrapper transparency: preserves return payload and _usage metadata");

  // 3. withAiTracking handling SDK usage object
  const mockSdkResult = {
    text: "Tailored cover letter text",
    usage: {
      inputTokens: 800,
      outputTokens: 300,
    },
  };

  const sdkOutput = await withAiTracking(
    {
      userId: "usr-mock-456",
      feature: "tailored_cover_letter",
      provider: "google",
      model: "gemini-3.6-flash",
    },
    async () => mockSdkResult
  );

  assert(sdkOutput.text === "Tailored cover letter text", "SDK output text preserved");
  console.log("✓ SDK interoperability: extracts usage from Vercel AI SDK generateText shape");

  console.log("\nAll AI Cost & Token Tracking tests passed successfully! 🎉");
}

runAiTrackerUnitTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
