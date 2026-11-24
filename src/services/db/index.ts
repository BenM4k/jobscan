import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL?.trim();

if (
  !connectionString &&
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build"
) {
  throw new Error("DATABASE_URL environment variable is required");
}

const basePool = connectionString
  ? new Pool({
      connectionString,
      ssl:
        process.env.DB_SSL_REJECT_UNAUTHORIZED === "false"
          ? { rejectUnauthorized: false }
          : undefined,
    })
  : new Pool({ connectionString: undefined });

const pool: Pool = connectionString
  ? basePool
  : new Proxy(basePool, {
      get(target, prop, receiver) {
        if (prop === "query" || prop === "connect") {
          return () =>
            Promise.reject(
              new Error("DATABASE_URL environment variable is required")
            );
        }
        return Reflect.get(target, prop, receiver);
      },
    });

export const db = drizzle(pool, { schema });
