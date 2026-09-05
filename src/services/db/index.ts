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

const cleanConnectionString = isRemote
  ? connectionString.replace(/[?&]sslmode=[^&]+/, "")
  : connectionString;

const pool = new Pool({
  connectionString: cleanConnectionString,
  ssl: isRemote ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });
