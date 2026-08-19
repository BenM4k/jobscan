if (typeof window !== "undefined") {
  throw new Error("This module can only be executed on the server.");
}
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://benny:bennymak@localhost:5432/jobscan";

const isRemote =
  connectionString.includes("prisma.io") ||
  connectionString.includes("neon.tech") ||
  connectionString.includes("supabase.co") ||
  connectionString.includes("sslmode");

const pool = new Pool({
  connectionString,
  ssl: isRemote ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });
