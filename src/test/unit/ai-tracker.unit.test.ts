import {
  withAiTracking,
  calculateEstimatedCost,
} from "@/services/ai/tracker";
import * as opsDal from "@/dal/ops.dal";
import { ok } from "@/lib/result";

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
    gemini38Cost === "0.002625",
    `Expected 0.002625 for gemini-3.8-flash, got ${gemini38Cost}`
  );

  const geminiCost = calculateEstimatedCost("gemini-3.6-flash", 1000, 500);
  assert(geminiCost !== undefined, "Gemini cost should be calculated");
  // 1000 tokens in = 0.00075, 500 tokens out = 0.001875 -> total = 0.002625
  assert(
    geminiCost === "0.002625",
    `Expected 0.002625 for gemini-3.6-flash, got ${geminiCost}`
  );

  const claudeCost = calculateEstimatedCost("claude-3-5-sonnet-latest", 1000, 1000);
  // 1000 in = 0.003, 1000 out = 0.015 -> total = 0.018
  assert(
    claudeCost === "0.018000",
    `Expected 0.018000 for claude, got ${claudeCost}`
  );

  // Longest matching key test: gpt-4o-mini vs gpt-4o
  const gpt4oMiniCost = calculateEstimatedCost("gpt-4o-mini", 1000, 1000);
  // 1000 in = 0.00015, 1000 out = 0.0006 -> total = 0.000750
  assert(
    gpt4oMiniCost === "0.000750",
    `Expected 0.000750 for gpt-4o-mini, got ${gpt4oMiniCost}`
  );
  console.log("✓ Pricing calculator: accurately computes USD cost per model and token breakdown");

  // Spy on opsDal.logAiCall
  const loggedCalls: opsDal.LogAiCallParams[] = [];
  opsDal.setLogAiCallImplementation(async (params: opsDal.LogAiCallParams) => {
    loggedCalls.push(params);
    return ok(undefined);
  });

  try {
    // 2. withAiTracking wrapper preserving output with _usage
    const mockScoringResult = {
      fitScore: 92,
      explanation: "Excellent match",
      _usage: {
        inputTokens: 1200,
        outputTokens: 450,
        modelId: "gemini-3.8-flash",
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
    assert(loggedCalls.length === 1, "Expected 1 logged AI call");
    const call1 = loggedCalls[0];
    assert(call1.userId === "usr-mock-123", "call1.userId must match");
    assert(call1.feature === "scoring", "call1.feature must match");
    assert(call1.provider === "gemini", "call1.provider must match");
    assert(call1.model === "gemini-3.8-flash", "call1.model must match");
    assert(call1.inputTokens === 1200, "call1.inputTokens must match");
    assert(call1.outputTokens === 450, "call1.outputTokens must match");
    assert(
      call1.costEstimateUsd === calculateEstimatedCost("gemini-3.8-flash", 1200, 450),
      "call1.costEstimateUsd must match calculated cost"
    );
    console.log("✓ Wrapper transparency: preserves return payload and records telemetry from _usage");

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
        model: "gemini-3.8-flash",
      },
      async () => mockSdkResult
    );

    assert(sdkOutput.text === "Tailored cover letter text", "SDK output text preserved");
    assert(loggedCalls.length === 2, "Expected 2 logged AI calls");
    const call2 = loggedCalls[1];
    assert(call2.userId === "usr-mock-456", "call2.userId must match");
    assert(call2.feature === "tailored_cover_letter", "call2.feature must match");
    assert(call2.provider === "google", "call2.provider must match");
    assert(call2.model === "gemini-3.8-flash", "call2.model must match");
    assert(call2.inputTokens === 800, "call2.inputTokens must match");
    assert(call2.outputTokens === 300, "call2.outputTokens must match");
    assert(
      call2.costEstimateUsd === calculateEstimatedCost("gemini-3.8-flash", 800, 300),
      "call2.costEstimateUsd must match calculated cost"
    );
    console.log("✓ SDK interoperability: extracts usage from Vercel AI SDK generateText shape");

    // 4. withAiTracking unwrapping Result.value
    const mockResultValue = {
      ok: true,
      value: {
        fitScore: 88,
        _usage: {
          inputTokens: 600,
          outputTokens: 250,
          modelId: "gemini-3.8-flash",
        },
      },
    };

    const resOutput = await withAiTracking(
      {
        userId: "usr-mock-789",
        feature: "scoring",
        provider: "gemini",
      },
      async () => mockResultValue
    );

    assert(resOutput.ok === true && resOutput.value.fitScore === 88, "Result object preserved");
    assert(loggedCalls.length === 3, "Expected 3 logged AI calls");
    const call3 = loggedCalls[2];
    assert(call3.inputTokens === 600, "call3.inputTokens from Result.value must match");
    assert(call3.outputTokens === 250, "call3.outputTokens from Result.value must match");
    console.log("✓ Result unwrapping: successfully inspects Result.value for _usage");
  } finally {
    opsDal.setLogAiCallImplementation();
  }

  console.log("\nAll AI Cost & Token Tracking tests passed successfully! 🎉");
}

runAiTrackerUnitTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
