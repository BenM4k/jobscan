import "dotenv/config";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

async function runMigration() {
  const connectionString =
    process.env.DATABASE_URL ||
    "postgres://benny:bennymak@localhost:5432/jobscan";

  console.log("Connecting to database for migration...");

  const isRemote =
    connectionString.includes("prisma.io") ||
    connectionString.includes("neon.tech") ||
    connectionString.includes("supabase.co") ||
    connectionString.includes("sslmode");

  const pool = new Pool({
    connectionString,
    ssl: isRemote ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 15000,
  });

  const db = drizzle(pool, { schema });

  console.log("Applying migrations from ./drizzle folder...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("✓ Migrations applied successfully!");

  await pool.end();
  process.exit(0);
}

runMigration().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
