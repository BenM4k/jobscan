import "dotenv/config";
import { Pool } from "pg";

async function testLocal() {
  const localUrl =
    process.env.DATABASE_URL || "postgres://localhost:5432/jobscan";
  console.log("Testing connection to postgres...");
  const pool = new Pool({
    connectionString: localUrl,
  });

  try {
    const client = await pool.connect();
    console.log("✓ Connected successfully to local Postgres!");
    const versionRes = await client.query("SELECT version();");
    console.log("Version:", versionRes.rows[0]);

    // Check available extensions
    const extRes = await client.query("SELECT * FROM pg_available_extensions WHERE name = 'vector';");
    console.log("Vector extension available:", extRes.rows);

    client.release();
  } catch (e: any) {
    console.error("Failed to connect to local Postgres:", e.message);
  } finally {
    await pool.end();
  }
}

testLocal();


