import "dotenv/config";
import { db } from "../src/services/db";
import { job } from "../src/services/db/schema";
import { embedText } from "../src/services/ai/embed";
import { sql, isNull } from "drizzle-orm";

const RATE_LIMIT_DELAY_MS = 200; // 200ms delay between calls to respect Gemini API rate limits

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Step 9 — Backfill Embeddings with HNSW Index Sequencing
 *
 * Sequencing:
 * 1. Drop the HNSW index (if it exists) to avoid expensive per-insert index rebalances during bulk updates.
 * 2. Fetch all jobs where embedding IS NULL.
 * 3. Sequentially generate embeddings via embedText(title + "\n\n" + description) with rate-limit delays.
 * 4. Update job.embedding.
 * 5. Recreate the HNSW index once all jobs are populated.
 * 6. Run EXPLAIN ANALYZE on a test similarity query to verify the HNSW index is active.
 */
export async function backfillJobEmbeddings(options: { batchSize?: number; dropIndexFirst?: boolean } = {}) {
  const { dropIndexFirst = true } = options;
  console.log("=================================================");
  console.log("🚀 Starting Step 9: HNSW Embeddings Backfill...");
  console.log("=================================================\n");

  // Step 1: Drop index if requested to allow faster bulk writes
  if (dropIndexFirst) {
    console.log("1. Dropping existing HNSW index 'job_embedding_hnsw_idx' (if present)...");
    await db.execute(sql`DROP INDEX IF EXISTS "job_embedding_hnsw_idx";`);
    console.log("   ✓ Index dropped successfully (or did not exist).\n");
  }

  // Step 2: Query jobs lacking embeddings
  console.log("2. Fetching jobs with missing embeddings (embedding IS NULL)...");
  const jobsToEmbed = await db
    .select({
      id: job.id,
      title: job.title,
      description: job.description,
    })
    .from(job)
    .where(isNull(job.embedding));

  console.log(`   Found ${jobsToEmbed.length} job(s) requiring embeddings.\n`);

  if (jobsToEmbed.length > 0) {
    console.log("3. Backfilling embeddings with rate-limit pacing...");
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < jobsToEmbed.length; i++) {
      const currentJob = jobsToEmbed[i];
      const jobText = `${currentJob.title}\n\n${currentJob.description || ""}`;

      console.log(`   [${i + 1}/${jobsToEmbed.length}] Embedding job "${currentJob.title.slice(0, 40)}"...`);

      const embedRes = await embedText(jobText);
      if (!embedRes.ok) {
        console.warn(`   ⚠️ Failed to generate embedding for job ${currentJob.id}: ${embedRes.error.message}`);
        failed++;
      } else {
        const vectorLiteral = `[${embedRes.value.join(",")}]`;
        await db.execute(
          sql`UPDATE "job" SET "embedding" = ${vectorLiteral}::vector, "updated_at" = NOW() WHERE "id" = ${currentJob.id}`
        );
        succeeded++;
      }

      // Delay between API calls to prevent 429 rate limit errors
      if (i < jobsToEmbed.length - 1) {
        await sleep(RATE_LIMIT_DELAY_MS);
      }
    }

    console.log(`\n   ✓ Backfill complete: ${succeeded} succeeded, ${failed} failed.\n`);
  } else {
    console.log("   ✓ All jobs already have embeddings. No backfill updates needed.\n");
  }

  // Step 4: (Re)create HNSW Index with vector_cosine_ops
  console.log("4. Building HNSW index 'job_embedding_hnsw_idx' on job(embedding)...");
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "job_embedding_hnsw_idx"
    ON "job" USING hnsw ("embedding" vector_cosine_ops);
  `);
  console.log("   ✓ HNSW index created successfully using vector_cosine_ops.\n");

  // Step 5: Verify with EXPLAIN ANALYZE
  console.log("5. Running EXPLAIN ANALYZE on cosine distance query...");
  const dummyVector = `[${Array(1536).fill(0.01).join(",")}]`;
  const explainResult = await db.execute(sql`
    EXPLAIN ANALYZE
    SELECT "id", "title", "embedding" <=> ${dummyVector}::vector AS "distance"
    FROM "job"
    WHERE "embedding" IS NOT NULL
    ORDER BY "embedding" <=> ${dummyVector}::vector
    LIMIT 5;
  `);

  console.log("   Query Plan Output:");
  for (const row of explainResult.rows) {
    console.log(`     ${row["QUERY PLAN"]}`);
  }

  console.log("\n=================================================");
  console.log("✨ Step 9 Embeddings Backfill & HNSW Index Complete!");
  console.log("=================================================\n");
}

if (require.main === module || process.argv[1]?.endsWith("backfill-embeddings.ts")) {
  backfillJobEmbeddings()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Backfill execution failed:", err);
      process.exit(1);
    });
}
