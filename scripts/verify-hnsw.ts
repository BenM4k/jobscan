import "dotenv/config";
import { Pool } from "pg";

async function verifyHnsw() {
  const connectionString =
    process.env.DATABASE_URL || "postgres://localhost:5432/jobscan";

  console.log("Connecting to PostgreSQL...");
  const pool = new Pool({ connectionString });

  let client;
  try {
    client = await pool.connect();
    console.log("✓ Connected to PostgreSQL database.");

    // 1. Verify extension
    const extRes = await client.query(
      "SELECT * FROM pg_extension WHERE extname = 'vector';"
    );
    if (extRes.rows.length === 0) {
      throw new Error("pgvector extension is not installed in database.");
    }
    console.log("✓ pgvector extension is installed (version:", extRes.rows[0].extversion, ")");

    // 2. Ensure HNSW index exists on job(embedding)
    const indexRes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'job' AND indexname = 'job_embedding_hnsw_idx';
    `);

    if (indexRes.rows.length === 0) {
      console.log("Creating HNSW index 'job_embedding_hnsw_idx' on job(embedding)...");
      await client.query(`
        CREATE INDEX IF NOT EXISTS "job_embedding_hnsw_idx"
        ON "job" USING hnsw ("embedding" vector_cosine_ops);
      `);
      console.log("✓ Created HNSW index successfully.");
    } else {
      const indexDef = indexRes.rows[0].indexdef || "";
      if (!indexDef.includes("USING hnsw") || !indexDef.includes("vector_cosine_ops")) {
        throw new Error(
          `Index 'job_embedding_hnsw_idx' definition does not contain 'USING hnsw' and 'vector_cosine_ops': ${indexDef}`
        );
      }
      console.log("✓ Found valid HNSW index:", indexDef);
    }

    // 3. Confirm with EXPLAIN ANALYZE
    const dummyVector = `[${Array(1536).fill(0.01).join(",")}]`;

    console.log("\nRunning EXPLAIN ANALYZE for cosine similarity search (ORDER BY embedding <=> query LIMIT 5):");
    const explainRes = await client.query(`
      EXPLAIN ANALYZE
      SELECT id, title, embedding <=> $1::vector AS distance
      FROM job
      ORDER BY embedding <=> $1::vector
      LIMIT 5;
    `, [dummyVector]);

    for (const row of explainRes.rows) {
      console.log(row["QUERY PLAN"]);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Verification error:", msg);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

verifyHnsw();
