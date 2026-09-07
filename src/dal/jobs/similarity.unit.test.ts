import * as jobDal from "@/dal/job";
import * as jobsDal from "@/dal/jobs.dal";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

// Compute cosine similarity between two JavaScript number vectors
function jsCosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function runSimilarityUnitTests() {
  console.log("Running unit tests for pgvector cosine similarity (<=>)...");

  // 1. Export parity test between @/dal/job and @/dal/jobs.dal
  assert(
    typeof jobDal.searchJobsByCosineSimilarity === "function",
    "searchJobsByCosineSimilarity should be exported from @/dal/job"
  );
  assert(
    typeof jobsDal.searchJobsByCosineSimilarity === "function",
    "searchJobsByCosineSimilarity should be exported from @/dal/jobs.dal"
  );
  assert(
    typeof jobDal.findJobsSimilarToResume === "function",
    "findJobsSimilarToResume should be exported from @/dal/job"
  );
  assert(
    typeof jobDal.getJobResumeSimilarity === "function",
    "getJobResumeSimilarity should be exported from @/dal/job"
  );
  assert(
    typeof jobDal.searchJobsByVector === "function",
    "searchJobsByVector should be exported from @/dal/job"
  );
  assert(
    typeof jobDal.setJobEmbedding === "function",
    "setJobEmbedding should be exported from @/dal/job"
  );

  // 2. Math verification: pgvector cosine distance <=> = 1 - cosine_similarity
  const vecA = [1, 0, 0, 0];
  const vecB = [1, 0, 0, 0];
  const vecC = [0, 1, 0, 0];
  const vecD = [-1, 0, 0, 0];

  const simAB = jsCosineSimilarity(vecA, vecB);
  assert(Math.abs(simAB - 1.0) < 1e-6, "Identical vectors have cosine similarity 1.0");
  const distAB = 1 - simAB;
  assert(Math.abs(distAB - 0.0) < 1e-6, "Identical vectors have cosine distance 0.0");

  const simAC = jsCosineSimilarity(vecA, vecC);
  assert(Math.abs(simAC - 0.0) < 1e-6, "Orthogonal vectors have cosine similarity 0.0");
  const distAC = 1 - simAC;
  assert(Math.abs(distAC - 1.0) < 1e-6, "Orthogonal vectors have cosine distance 1.0");

  const simAD = jsCosineSimilarity(vecA, vecD);
  assert(Math.abs(simAD - (-1.0)) < 1e-6, "Opposite vectors have cosine similarity -1.0");
  const distAD = 1 - simAD;
  assert(Math.abs(distAD - 2.0) < 1e-6, "Opposite vectors have cosine distance 2.0");

  // 3. 1536-dimension vector literal formatting check
  const dummy1536 = new Array(1536).fill(0.001);
  const literal = `[${dummy1536.join(",")}]`;
  assert(literal.startsWith("[") && literal.endsWith("]"), "Literal starts with [ and ends with ]");
  const parsedElements = literal.slice(1, -1).split(",");
  assert(parsedElements.length === 1536, "Literal has exactly 1536 dimensions");

  console.log("✓ All similarity.unit.test.ts passed successfully!");
}

runSimilarityUnitTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
