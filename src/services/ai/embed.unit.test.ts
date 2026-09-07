import { generateEmbedding, embedText, embedResume, embedJob } from "./embed";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runEmbedUnitTests() {
  console.log("Running unit tests for embed.ts...");

  // 1. Validation error on empty text
  const emptyRes = await generateEmbedding("");
  assert(!emptyRes.ok, "Empty string should return Result.err");
  if (!emptyRes.ok) {
    assert(emptyRes.error.code === "VALIDATION_ERROR", "Should return VALIDATION_ERROR");
  }

  const whitespaceRes = await generateEmbedding("   \n\t  ");
  assert(!whitespaceRes.ok, "Whitespace-only string should return Result.err");
  if (!whitespaceRes.ok) {
    assert(whitespaceRes.error.code === "VALIDATION_ERROR", "Should return VALIDATION_ERROR");
  }

  // 2. Alias check
  assert(embedText === generateEmbedding, "embedText must be an alias of generateEmbedding");

  // 3. Graceful fallback when API keys are absent (no uncaught exception)
  const prevGemini = process.env.GEMINI_API_KEY;
  const prevGoogle = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const prevOpenai = process.env.OPENAI_API_KEY;

  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  try {
    const noKeyRes = await generateEmbedding("Software Engineer at Acme Corp");
    assert(!noKeyRes.ok, "Should return Result.err when no API keys are configured");
    if (!noKeyRes.ok) {
      assert(noKeyRes.error.code === "EXTERNAL_API_ERROR", "Should return EXTERNAL_API_ERROR");
      assert(noKeyRes.error.message.includes("Neither GEMINI_API_KEY nor OPENAI_API_KEY"), "Helpful message");
    }

    const noKeyJobRes = await embedJob("test-job-id", {
      title: "Backend Engineer",
      company: "Acme",
      description: "Building scalable distributed systems with Go and PostgreSQL",
    });
    assert(!noKeyJobRes.ok, "embedJob should return Result.err without throwing when no key");

    const noKeyResumeRes = await embedResume("test-resume-id", "test-user-id", "Experienced software engineer");
    assert(!noKeyResumeRes.ok, "embedResume should return Result.err without throwing when no key");
  } finally {
    if (prevGemini) process.env.GEMINI_API_KEY = prevGemini;
    if (prevGoogle) process.env.GOOGLE_GENERATIVE_AI_API_KEY = prevGoogle;
    if (prevOpenai) process.env.OPENAI_API_KEY = prevOpenai;
  }

  console.log("✓ All embed.unit.test.ts passed successfully!");
}

runEmbedUnitTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
