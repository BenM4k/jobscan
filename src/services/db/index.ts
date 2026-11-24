import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import * as schema from "./schema";

const REMOTE_MANAGED_DB_HOSTS = [
  "supabase.co",
  "supabase.com",
  "neon.tech",
  "prisma.io",
] as const;

function isRemoteManagedDatabaseHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return REMOTE_MANAGED_DB_HOSTS.some(
    (domain) => lower === domain || lower.endsWith(`.${domain}`)
  );
}

/** Builds a pg PoolConfig ensuring explicit SSL options are never overridden by URL params. */
export function buildPoolConfig(
  rawConnectionString: string,
  env: Record<string, string | undefined> = process.env
): PoolConfig {
  const disableCertVerify = env.DB_SSL_REJECT_UNAUTHORIZED === "false";

  let parsed: URL;
  try {
    parsed = new URL(rawConnectionString);
  } catch {
    return {
      connectionString: rawConnectionString,
      ssl: disableCertVerify ? { rejectUnauthorized: false } : undefined,
    };
  }

  const sslMode = parsed.searchParams.get("sslmode")?.trim().toLowerCase();
  const sslParam = parsed.searchParams.get("ssl")?.trim().toLowerCase();
  const hasUrlSslParam = sslMode !== undefined || sslParam !== undefined;
  const urlDisablesSsl =
    sslMode === "disable" || sslParam === "false" || sslParam === "0";
  const hasPgSslMode = Boolean(env.PGSSLMODE?.trim());

  if (disableCertVerify) {
    parsed.searchParams.delete("sslmode");
    parsed.searchParams.delete("ssl");
    return {
      connectionString: parsed.toString(),
      ssl: { rejectUnauthorized: false },
    };
  }

  if (urlDisablesSsl) {
    return {
      connectionString: rawConnectionString,
      ssl: undefined,
    };
  }

  if (hasUrlSslParam) {
    parsed.searchParams.delete("sslmode");
    parsed.searchParams.delete("ssl");
    return {
      connectionString: parsed.toString(),
      ssl: { rejectUnauthorized: true },
    };
  }

  if (hasPgSslMode) {
    return {
      connectionString: rawConnectionString,
      ssl: undefined,
    };
  }

  if (isRemoteManagedDatabaseHost(parsed.hostname)) {
    return {
      connectionString: rawConnectionString,
      ssl: { rejectUnauthorized: true },
    };
  }

  return {
    connectionString: rawConnectionString,
    ssl: undefined,
  };
}

const connectionString = process.env.DATABASE_URL?.trim();

if (
  !connectionString &&
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build"
) {
  throw new Error("DATABASE_URL environment variable is required");
}

const basePool = connectionString
  ? new Pool(buildPoolConfig(connectionString))
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
