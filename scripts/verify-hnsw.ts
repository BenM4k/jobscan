import "dotenv/config";
import { Pool } from "pg";

async function verify() {
  const localUrl =
    process.env.DATABASE_URL || "postgres://localhost:5432/jobscan";

  console.log("Connecting to postgres...");
  const pool = new Pool({ connectionString: localUrl });

  try {
    const client = await pool.connect();
    console.log("Connected successfully.");

    // Check tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    console.log("Existing tables:", tables.rows.map(r => r.table_name));

    client.release();
  } catch (err: any) {
    console.error("Error:", err.message);
  } finally {
    await pool.end();
  }
}

verify();
