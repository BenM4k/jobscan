import "server-only";
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

function cleanConnectionString(rawUrl: string, remote: boolean): string {
  if (!remote) return rawUrl;
  try {
    const url = new URL(rawUrl);
    url.searchParams.delete("sslmode");
    return url.toString();
  } catch {
    return rawUrl;
  }
}

const sanitizedConnectionString = cleanConnectionString(connectionString, isRemote);

const pool = new Pool({
  connectionString: sanitizedConnectionString,
  ssl: isRemote ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });
