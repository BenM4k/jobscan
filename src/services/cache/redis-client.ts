import "server-only";
import Redis, { type RedisOptions } from "ioredis";

/**
 * Global declaration for Next.js development singleton persistence.
 * Prevents multiple Redis connections during hot module replacement (HMR).
 */
declare global {
  var __redisClientSingleton: Redis | undefined;
}

const DEFAULT_MAXMEMORY_POLICY = "allkeys-lru";

/**
 * Resolve Redis connection options from environment variables.
 * Prioritizes REDIS_URL (standard for Redis Cloud & Upstash on Vercel Marketplace).
 */
function getRedisOptions(): RedisOptions {
  const url = process.env.REDIS_URL;
  const isTls = url?.startsWith("rediss://");

  const baseOptions: RedisOptions = {
    lazyConnect: true,
    connectTimeout: 5000,
    commandTimeout: 3000,
    maxRetriesPerRequest: 3,
    enableOfflineQueue: false,
    retryStrategy: (times: number) => {
      if (times > 5) {
        return null; // Stop retrying after 5 attempts
      }
      return Math.min(times * 200, 2000); // Exponential backoff up to 2s
    },
  };

  if (isTls) {
    baseOptions.tls = {
      rejectUnauthorized: process.env.NODE_ENV === "production",
    };
  }

  return baseOptions;
}

/**
 * Initializes or retrieves the Redis client singleton instance.
 * Returns null if REDIS_URL is not configured.
 */
export function getRedisClient(): Redis | null {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return null;
  }

  if (globalThis.__redisClientSingleton) {
    return globalThis.__redisClientSingleton;
  }

  const options = getRedisOptions();
  const client = new Redis(redisUrl, options);

  client.on("error", (err) => {
    // Log connection errors without crashing the process
    console.error("[Redis] Client error:", err.message);
  });

  if (process.env.NODE_ENV !== "production") {
    globalThis.__redisClientSingleton = client;
  }

  return client;
}

/**
 * Verifies or sets the Redis maxmemory-policy (starting with allkeys-lru).
 * Managed cloud providers (e.g. Upstash, Redis Cloud) may restrict the CONFIG command;
 * in that case, this helper catches the restriction gracefully and returns diagnostic info.
 */
export async function ensureMaxMemoryPolicy(
  targetPolicy = process.env.REDIS_MAXMEMORY_POLICY || DEFAULT_MAXMEMORY_POLICY
): Promise<{ success: boolean; policy: string; notice?: string; error?: string }> {
  const client = getRedisClient();
  if (!client) {
    return {
      success: false,
      policy: "unknown",
      error: "REDIS_URL is not configured",
    };
  }

  try {
    if (client.status === "wait") {
      await client.connect();
    }

    // Attempt to inspect current policy via CONFIG GET
    try {
      const configRes = await client.config("GET", "maxmemory-policy");
      const currentPolicy = Array.isArray(configRes) && configRes.length >= 2 ? configRes[1] : undefined;

      if (currentPolicy === targetPolicy) {
        return { success: true, policy: currentPolicy };
      }

      // Try setting target policy
      await client.config("SET", "maxmemory-policy", targetPolicy);
      return { success: true, policy: targetPolicy };
    } catch (configErr) {
      const msg = configErr instanceof Error ? configErr.message : String(configErr);
      // Managed cloud environments frequently disallow CONFIG SET/GET via client commands
      return {
        success: true,
        policy: targetPolicy,
        notice: `CONFIG command restricted by provider (${msg}). Ensure maxmemory-policy is set to '${targetPolicy}' in provider dashboard.`,
      };
    }
  } catch (err) {
    return {
      success: false,
      policy: "unknown",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Retrieve and JSON-deserialize a value from Redis cache.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    if (client.status === "wait") {
      await client.connect();
    }
    const raw = await client.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[Redis] Failed to get cache key "${key}":`, err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * JSON-serialize and store a value in Redis cache with optional TTL.
 */
export async function cacheSet<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  try {
    if (client.status === "wait") {
      await client.connect();
    }
    const serialized = JSON.stringify(value);
    if (ttlSeconds && ttlSeconds > 0) {
      await client.set(key, serialized, "EX", ttlSeconds);
    } else {
      await client.set(key, serialized);
    }
  } catch (err) {
    console.warn(`[Redis] Failed to set cache key "${key}":`, err instanceof Error ? err.message : err);
  }
}

/**
 * Delete one or more keys from Redis cache.
 */
export async function cacheDel(...keys: string[]): Promise<number> {
  const client = getRedisClient();
  if (!client || keys.length === 0) return 0;

  try {
    if (client.status === "wait") {
      await client.connect();
    }
    return await client.del(...keys);
  } catch (err) {
    console.warn(`[Redis] Failed to delete cache keys:`, err instanceof Error ? err.message : err);
    return 0;
  }
}

/**
 * Cache-aside pattern helper: checks cache for key; if missing, invokes factory fn,
 * stores the result with TTL, and returns it.
 */
export async function cacheRemember<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }

  const fresh = await fn();
  await cacheSet(key, fresh, ttlSeconds);
  return fresh;
}

/**
 * Check Redis health, latency, and eviction policy.
 */
export async function getRedisHealth(): Promise<{
  status: "ok" | "degraded" | "disabled" | "error";
  maxmemoryPolicy?: string;
  latencyMs?: number;
  error?: string;
}> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return { status: "disabled", error: "REDIS_URL environment variable is not set" };
  }

  const client = getRedisClient();
  if (!client) {
    return { status: "error", error: "Could not initialize Redis client" };
  }

  const start = Date.now();
  try {
    if (client.status === "wait") {
      await client.connect();
    }
    const pong = await client.ping();
    const latencyMs = Date.now() - start;

    if (pong !== "PONG") {
      return { status: "degraded", latencyMs, error: `Unexpected PING response: ${pong}` };
    }

    const policyCheck = await ensureMaxMemoryPolicy();

    return {
      status: "ok",
      latencyMs,
      maxmemoryPolicy: policyCheck.policy,
    };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Gracefully close the Redis connection (useful in test teardown or process shutdown).
 */
export async function closeRedisConnection(): Promise<void> {
  const client = globalThis.__redisClientSingleton;
  if (client) {
    try {
      await client.quit();
    } catch {
      client.disconnect();
    }
    globalThis.__redisClientSingleton = undefined;
  }
}

/**
 * Token-bucket rate limiting result.
 */
export interface TokenBucketRateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

const TOKEN_BUCKET_LUA_SCRIPT = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local cost = tonumber(ARGV[3] or "1")
local now = tonumber(ARGV[4])

local data = redis.call('HMGET', key, 'tokens', 'last_updated')
local tokens = tonumber(data[1])
local last_updated = tonumber(data[2])

if not tokens or not last_updated then
  tokens = capacity
  last_updated = now
else
  local elapsed = math.max(0, now - last_updated)
  tokens = math.min(capacity, tokens + (elapsed * refill_rate))
  last_updated = now
end

local allowed = 0
local remaining = tokens
local retry_after = 0

if tokens >= cost then
  allowed = 1
  tokens = tokens - cost
  remaining = tokens
  redis.call('HMSET', key, 'tokens', tostring(tokens), 'last_updated', tostring(now))
  local ttl = math.max(60, math.ceil(capacity / math.max(refill_rate, 0.001)) * 2)
  redis.call('EXPIRE', key, ttl)
else
  allowed = 0
  remaining = tokens
  retry_after = math.ceil((cost - tokens) / math.max(refill_rate, 0.001))
end

return { allowed, tostring(remaining), retry_after }
`;

/**
 * Execute an atomic token-bucket rate limit check in Redis.
 * Fails open (allows request) if Redis is unavailable or unconfigured.
 */
export async function executeTokenBucketRateLimit(
  key: string,
  capacity: number,
  refillRatePerSec: number,
  cost: number = 1
): Promise<TokenBucketRateLimitResult> {
  const client = getRedisClient();
  if (!client) {
    return { allowed: true, remaining: capacity, retryAfterSeconds: 0 };
  }

  try {
    if (client.status === "wait") {
      await client.connect();
    }

    const nowSeconds = Date.now() / 1000;
    const res = (await client.eval(
      TOKEN_BUCKET_LUA_SCRIPT,
      1,
      key,
      String(capacity),
      String(refillRatePerSec),
      String(cost),
      String(nowSeconds)
    )) as [number, string, number];

    const allowed = res[0] === 1;
    const remaining = Math.max(0, Math.floor(parseFloat(res[1]) || 0));
    const retryAfterSeconds = res[2] || 0;

    return { allowed, remaining, retryAfterSeconds };
  } catch (err) {
    console.warn(`[Redis] Rate limit execution failed for key "${key}", failing open:`, err instanceof Error ? err.message : err);
    return { allowed: true, remaining: capacity, retryAfterSeconds: 0 };
  }
}

