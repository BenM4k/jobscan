import {
  logAiCall,
  withCostTracking,
  calculateEstimatedCost,
  MODEL_PRICING_PER_MILLION,
} from "@/services/ai/with-cost-tracking";
import { setLogAiCallImplementation, LogAiCallParams } from "@/dal/ops.dal";
import { ok } from "@/lib/result";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runCostTrackingUnitTests() {
  console.log("Running Step 17 Cost & Token Tracking unit tests...\n");

  // 1. Check exports
  assert(
    typeof logAiCall === "function",
    "logAiCall should be exported as a function"
  );
  assert(
    typeof withCostTracking === "function",
    "withCostTracking should be exported as a function"
  );
  assert(
    typeof calculateEstimatedCost === "function",
    "calculateEstimatedCost should be exported as a function"
  );
  console.log("✓ Exports verified: logAiCall, withCostTracking, calculateEstimatedCost");

  // 2. PRICING table checks
  assert(
    "gemini-embedding-2" in MODEL_PRICING_PER_MILLION,
    "gemini-embedding-2 must be present in MODEL_PRICING_PER_MILLION"
  );
  const embPricing = MODEL_PRICING_PER_MILLION["gemini-embedding-2"] as {
    input: number;
    output: number;
  };
  assert(
    embPricing.input === 0.2,
    `gemini-embedding-2 input pricing should be $0.20/1M, got ${embPricing.input}`
  );
  assert(
    embPricing.output === 0.0,
    `gemini-embedding-2 output pricing should be $0.00/1M, got ${embPricing.output}`
  );

  // Gemini 3.7 Flash pricing: separate pre- and post-boundary tests with frozen time
  const OriginalDate = globalThis.Date;
  try {
    // 1. Fixed pre-boundary test (before 2027 boundary): 0.75 + 3.75 = 4.50
    const mockPreDate = new Date("2026-09-10T12:00:00Z");
    class PreDateMock extends OriginalDate {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(mockPreDate.getTime());
        } else {
          super(...(args as [any]));
        }
      }
      static now() {
        return mockPreDate.getTime();
      }
    }
    globalThis.Date = PreDateMock as unknown as DateConstructor;

    const preFlashCost = calculateEstimatedCost("gemini-3.7-flash", 1_000_000, 1_000_000);
    assert(preFlashCost !== undefined, "preFlashCost should not be undefined");
    const parsedPreCost = parseFloat(preFlashCost!);
    assert(
      parsedPreCost === 4.5,
      `gemini-3.7-flash pre-boundary cost should be 4.500000, got ${preFlashCost}`
    );

    // 2. Fixed post-boundary test (post-2026 boundary): 1.50 + 7.50 = 9.00
    const mockPostDate = new Date("2027-01-02T00:00:00Z");
    class PostDateMock extends OriginalDate {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(mockPostDate.getTime());
        } else {
          super(...(args as [any]));
        }
      }
      static now() {
        return mockPostDate.getTime();
      }
    }
    globalThis.Date = PostDateMock as unknown as DateConstructor;

    const postFlashCost = calculateEstimatedCost("gemini-3.7-flash", 1_000_000, 1_000_000);
    assert(postFlashCost !== undefined, "postFlashCost should not be undefined");
    const parsedPostCost = parseFloat(postFlashCost!);
    assert(
      parsedPostCost === 9.0,
      `gemini-3.7-flash post-boundary cost should be 9.000000, got ${postFlashCost}`
    );
  } finally {
    globalThis.Date = OriginalDate;
  }

  // Gemini Embedding 2 cost check: 1,000,000 tokens -> $0.20
  const embCost = calculateEstimatedCost("gemini-embedding-2", 1_000_000, 0);
  assert(
    embCost === "0.200000",
    `gemini-embedding-2 1M tokens should cost 0.200000, got ${embCost}`
  );
  console.log("✓ PRICING table verified: gemini-3.7-flash and gemini-embedding-2 ($0.20/1M input, $0 output)");

  // 3. Mock opsDal to capture logged calls
  const loggedCalls: LogAiCallParams[] = [];
  setLogAiCallImplementation(async (params) => {
    loggedCalls.push(params);
    return ok(undefined);
  });

  // 4. Test logAiCall() directly (e.g. for Step 15 cache-hit branch)
  await logAiCall({
    userId: "user-123",
    feature: "scoring",
    provider: "cache",
    model: "hybrid-v1",
    inputTokens: null,
    outputTokens: null,
    costEstimateUsd: "0.000000",
    cacheHit: true,
  });

  assert(loggedCalls.length === 1, "Expected 1 logged call");
  assert(loggedCalls[0].cacheHit === true, "cacheHit should be true");
  assert(loggedCalls[0].inputTokens === null, "inputTokens should be null");
  assert(loggedCalls[0].outputTokens === null, "outputTokens should be null");
  console.log("✓ Direct logAiCall() for cache-hit branch verified with null token counts");

  // 5. Test logAiCall() with nullable userId (anonymized system call)
  await logAiCall({
    userId: null,
    feature: "scoring",
    provider: "google",
    model: "gemini-embedding-2",
    inputTokens: 500,
    outputTokens: 0,
    costEstimateUsd: "0.000100",
    cacheHit: false,
  });

  assert(loggedCalls.length === 2, "Expected 2 logged calls");
  assert(loggedCalls[1].userId === null, "aiCallLog.userId should support null");
  console.log("✓ Nullable userId for anonymized/system calls verified");

  // 6. Test withCostTracking with AI SDK generateText usage shape
  const mockAiResult = {
    output: { text: "analysis" },
    usage: { inputTokens: 1200, outputTokens: 300 },
  };

  const trackedResult = await withCostTracking(
    {
      userId: "user-456",
      feature: "scoring",
      provider: "google",
      model: "gemini-3.7-flash",
    },
    async () => mockAiResult
  );

  assert(trackedResult === mockAiResult, "withCostTracking must return the wrapped result");
  assert(loggedCalls.length === 3, "Expected 3 logged calls");
  const lastCall = loggedCalls[2];
  assert(lastCall.userId === "user-456", "User ID should be user-456");
  assert(lastCall.inputTokens === 1200, "inputTokens should be 1200");
  assert(lastCall.outputTokens === 300, "outputTokens should be 300");
  assert(typeof lastCall.costEstimateUsd === "string", "costEstimateUsd should be computed");
  console.log("✓ withCostTracking successfully extracts Vercel AI SDK usage and logs cost");

  // 7. Test withCostTracking with embed usage shape ({ tokens: number })
  const mockEmbedResult = {
    embedding: [0.1, 0.2],
    usage: { tokens: 800 },
  };

  await withCostTracking(
    {
      userId: "user-789",
      feature: "scoring",
      provider: "google",
      model: "gemini-embedding-2",
    },
    async () => mockEmbedResult
  );

  assert(loggedCalls.length === 4, "Expected 4 logged calls");
  const embedCall = loggedCalls[3];
  assert(embedCall.inputTokens === 800, `Expected 800 tokens, got ${embedCall.inputTokens}`);
  assert(embedCall.outputTokens === 0, "Embedding outputTokens should be 0");
  console.log("✓ withCostTracking successfully handles embedding usage { tokens: number }");

  console.log("\nAll Step 17 Cost/Token Tracking unit tests passed successfully! 🎉");
}

runCostTrackingUnitTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
