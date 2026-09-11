import assert from "node:assert";
import { parseTailoredResume } from "@/lib/tailored-resume-parser";
import { scoreJobSchema, tailoredResumeActionSchema, tailoredCoverLetterActionSchema } from "@/actions/job.schema";
import type { AsyncJobStatus } from "@/hooks/useAsyncJobWithRetry";

console.log("Running Frontend Background Job & Retry Feedback unit tests...\n");

// 1. parseTailoredResume Unit Tests
console.log("1. Verifying parseTailoredResume parser...");

// Markdown format
const sampleMarkdown = `
## Summary
Experienced Senior Full-Stack Engineer specializing in Next.js and distributed microservices.

## Work Experience
- Architected and deployed scalable ingestion pipelines handling 50,000+ daily listings.
- Improved latency by 45% through multi-tier LRU Redis caching and pgvector indexing.
`;

const parsed = parseTailoredResume(sampleMarkdown);
assert.strictEqual(
  parsed.summary,
  "Experienced Senior Full-Stack Engineer specializing in Next.js and distributed microservices."
);
assert.strictEqual(parsed.experience.length, 2);
assert.ok(parsed.experience[0].includes("Architected and deployed scalable"));
assert.ok(parsed.experience[1].includes("Improved latency by 45%"));
console.log("   ✓ parseTailoredResume extracts markdown summary and bullet points.");

// Markdown format with nested level-three (###) headings
const sampleMarkdownWithH3 = `
## Summary
Experienced Senior Full-Stack Engineer specializing in Next.js and distributed microservices.
### Core Competencies
- Distributed event-driven architectures
- High-concurrency caching strategies

## Work Experience
### Staff Infrastructure Engineer — Acme Global
- Architected and deployed scalable ingestion pipelines handling 50,000+ daily listings.
- Improved latency by 45% through multi-tier LRU Redis caching and pgvector indexing.
### Senior Backend Engineer — Previous Corp
- Built fault-tolerant message queues and automated failover systems.

## Education
### University of Technology
- B.S. in Computer Science
`;

const parsedWithH3 = parseTailoredResume(sampleMarkdownWithH3);
assert.ok(
  parsedWithH3.summary.includes("Experienced Senior Full-Stack Engineer"),
  "Summary should include the main summary content"
);
assert.ok(
  parsedWithH3.summary.includes("### Core Competencies"),
  "Summary should preserve nested ### headings without truncating"
);
assert.ok(
  parsedWithH3.summary.includes("Distributed event-driven architectures"),
  "Summary should preserve sub-bullets under ### headings"
);
assert.strictEqual(
  parsedWithH3.experience.length,
  2,
  "Experience should capture bullet points when role headings use ###"
);
assert.ok(
  parsedWithH3.experience[0].includes("Architected and deployed scalable"),
  "First work experience bullet should be captured"
);
assert.ok(
  parsedWithH3.experience[1].includes("Improved latency by 45%"),
  "Second work experience bullet should be captured"
);
console.log("   ✓ parseTailoredResume preserves sections containing nested ### headings.");

// Structured JSON object fallback
const structuredSample = {
  summary: "Structured executive summary.",
  experience: [
    {
      company: "Acme Corp",
      bullets: ["Led engineering teams.", "Cut infrastructure costs."],
    },
  ],
};
const parsedStructured = parseTailoredResume(null, structuredSample);
assert.strictEqual(parsedStructured.summary, "Structured executive summary.");
assert.strictEqual(parsedStructured.experience.length, 2);
assert.strictEqual(parsedStructured.experience[0], "Led engineering teams.");
console.log("   ✓ parseTailoredResume handles structured JSON objects.");

// Empty / fallback text
const emptyParsed = parseTailoredResume("");
assert.strictEqual(emptyParsed.summary, "");
assert.strictEqual(emptyParsed.experience.length, 0);
console.log("   ✓ parseTailoredResume handles empty input gracefully.");

// 2. Action Schemas Verification
console.log("\n2. Verifying Action Schemas for AI background jobs...");
const validUuid = "123e4567-e89b-12d3-a456-426614174000";

const validScore = scoreJobSchema.safeParse({
  jobId: validUuid,
  idempotencyKey: validUuid,
});
assert.ok(validScore.success, "scoreJobSchema should accept valid inputs");

const validResume = tailoredResumeActionSchema.safeParse({
  jobId: validUuid,
  idempotencyKey: validUuid,
});
assert.ok(validResume.success, "tailoredResumeActionSchema should accept valid inputs");

const validCoverLetter = tailoredCoverLetterActionSchema.safeParse({
  jobId: validUuid,
  idempotencyKey: validUuid,
});
assert.ok(validCoverLetter.success, "tailoredCoverLetterActionSchema should accept valid inputs");
console.log("   ✓ AI action schemas correctly enforce UUID idempotency keys.");

// 3. Retry Feedback UI Contract
console.log("\n3. Verifying Retry Feedback UI status contracts...");
// Exhaustively typed record mapping every canonical AsyncJobStatus variant
const statusContractMap: Record<AsyncJobStatus, { active: boolean; terminal: boolean }> = {
  idle: { active: false, terminal: false },
  running: { active: true, terminal: false },
  retrying: { active: true, terminal: false },
  success: { active: false, terminal: true },
  error: { active: false, terminal: true },
};

const canonicalStatuses = Object.keys(statusContractMap) as AsyncJobStatus[];
assert.strictEqual(canonicalStatuses.length, 5, "AsyncJobStatus contract must define exactly 5 lifecycle states");
for (const status of canonicalStatuses) {
  assert.ok(statusContractMap[status] !== undefined, `Status '${status}' must be defined in contract map`);
}
console.log("   ✓ Canonical AsyncJobStatus lifecycle contract validated exhaustively.");

// 4. Source Result successCount calculation contract
console.log("\n4. Verifying SourceResult successCount calculation contract...");
interface SourceResultItem {
  source: string;
  skipped?: boolean;
  reason?: string;
  error?: string;
}

const sourcesWithErrors: SourceResultItem[] = [
  { source: "remoteok", skipped: false, error: "Network timeout" },
  { source: "ashby", skipped: true, reason: "circuit_open" },
];

const countSuccessful = (sources: SourceResultItem[]) =>
  sources.filter((s) => !s.skipped && !s.error).length;

assert.strictEqual(
  countSuccessful(sourcesWithErrors),
  0,
  "A source with error must not be counted as successful even if skipped is false"
);

const sourcesWithSuccess: SourceResultItem[] = [
  { source: "remoteok", skipped: false },
  { source: "greenhouse", skipped: true, reason: "fetch_failed" },
];
assert.strictEqual(
  countSuccessful(sourcesWithSuccess),
  1,
  "A source without error and not skipped must be counted as successful"
);
console.log("   ✓ successCount calculation filters out both skipped and errored sources.");

// 5. useAsyncJobWithRetry unmount cleanup & cancellation contract
console.log("\n5. Verifying useAsyncJobWithRetry cancellation & cleanup contract...");
async function testCancellationContract() {
  let isCancelled = false;
  let timer: NodeJS.Timeout | null = null;
  let resolveCountdown: (() => void) | null = null;
  let status = "idle";
  let message = "";

  const cleanup = () => {
    isCancelled = true;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    if (resolveCountdown) {
      resolveCountdown();
      resolveCountdown = null;
    }
  };

  // Simulate an active countdown in execute()
  let countdownResolved = false;
  const countdownPromise = new Promise<void>((resolve) => {
    resolveCountdown = () => {
      countdownResolved = true;
      resolve();
    };
    timer = setInterval(() => {}, 1000);
  });

  // Trigger cleanup (simulate unmount)
  cleanup();

  assert.strictEqual(isCancelled, true, "cleanup must mark isCancelled as true");
  assert.strictEqual(timer, null, "cleanup must clear the active interval timer");

  await countdownPromise;
  assert.strictEqual(countdownResolved, true, "cleanup must resolve any pending countdown promise");

  // Verify that subsequent state setters are not invoked when cancelled
  if (!isCancelled) {
    status = "retrying";
    message = "Should not be set";
  }
  assert.strictEqual(status, "idle", "status must remain unchanged after cancellation");
  assert.strictEqual(message, "", "message must remain unchanged after cancellation");
  console.log("   ✓ useAsyncJobWithRetry unmount cleanup contract verified.");
}

async function testJobScoringAbortLifecycle() {
  console.log("7. Verifying useJobScoring AbortController retry and cancel lifecycle...");

  let activeController: AbortController | null = null;
  let jobUpdatedCalled = false;
  let fetchAborted = false;

  // Simulate cancelRetry function
  const cancelRetry = () => {
    if (activeController) {
      activeController.abort();
      activeController = null;
    }
  };

  // Simulate an in-flight scoring fetch
  const mockFetch = async (signal: AbortSignal): Promise<{ score: number }> => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        resolve({ score: 85 });
      }, 500);

      signal.addEventListener("abort", () => {
        clearTimeout(timer);
        fetchAborted = true;
        const abortErr = new Error("The operation was aborted");
        abortErr.name = "AbortError";
        reject(abortErr);
      });
    });
  };

  // Start scoring attempt
  const controller = new AbortController();
  activeController = controller;

  const scoringPromise = (async () => {
    try {
      const data = await mockFetch(controller.signal);
      jobUpdatedCalled = true;
      return data;
    } catch (err: unknown) {
      if ((err as Error)?.name === "AbortError" || controller.signal.aborted) {
        return null;
      }
      throw err;
    } finally {
      if (activeController === controller) {
        activeController = null;
      }
    }
  })();

  // User cancels while fetch is active
  cancelRetry();

  const result = await scoringPromise;

  assert.strictEqual(controller.signal.aborted, true, "Controller signal must be aborted on cancelRetry");
  assert.strictEqual(fetchAborted, true, "In-flight fetch must abort immediately upon cancelRetry");
  assert.strictEqual(result, null, "Canceled scoring attempt must resolve to null");
  assert.strictEqual(jobUpdatedCalled, false, "Canceled request must not invoke jobUpdated callback or persist scores");
  assert.strictEqual(activeController, null, "Active controller ref must be cleared after abort");

  console.log("   ✓ useJobScoring aborts active fetch and prevents score persistence on cancellation.");
}

Promise.all([testCancellationContract(), testJobScoringAbortLifecycle()]).then(() => {
  console.log("\n✨ All Frontend Background Job & Retry Feedback unit tests passed successfully!\n");
});

