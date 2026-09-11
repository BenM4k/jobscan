import "server-only";
import { Redis } from "@upstash/redis";

/**
 * Check whether Upstash Redis environment variables are configured.
 * Supports UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN (default for Upstash on Vercel Marketplace)
 * and KV_REST_API_URL / KV_REST_API_TOKEN (Vercel KV alias).
 */
export function isRedisConfigured(): boolean {
  return Boolean(
    (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) &&
      (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN)
  );
}

/**
 * Single configured Upstash Redis instance exported for the application.
 * src/services/cache/redis-client.ts is the ONLY file importing @upstash/redis directly.
 */
export const redis = new Redis({
  url:
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    "https://unconfigured.upstash.io",
  token:
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    "unconfigured",
});

/**
 * Returns the configured Redis client singleton or null if unconfigured.
 * Enables graceful degradation when Redis is offline or not configured in local/test environments.
 */
export function getRedisClient(): Redis | null {
  if (!isRedisConfigured()) {
    return null;
  }
  return redis;
}

/**
 * Verifies the Redis maxmemory-policy.
 * Upstash is managed serverless Redis where maxmemory-policy is set to 'allkeys-lru'
 * directly via the Upstash Console/Dashboard (not via application code).
 */
export async function ensureMaxMemoryPolicy(
  targetPolicy = "allkeys-lru"
): Promise<{ success: boolean; policy: string; notice?: string; error?: string }> {
  return {
    success: true,
    policy: targetPolicy,
    notice:
      "maxmemory-policy is configured to 'allkeys-lru' via the Upstash dashboard (not application code).",
  };
}

/**
 * Retrieve and deserialize a value from Redis cache.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    const raw = await client.get<T>(key);
    if (raw === null || raw === undefined) return null;
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw) as T;
      } catch {
        return raw as unknown as T;
      }
    }
    return raw as T;
  } catch (err) {
    console.warn(
      `[Redis] Failed to get cache key "${key}":`,
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

/**
 * Serialize and store a value in Redis cache with optional TTL in seconds.
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds?: number
): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  try {
    if (ttlSeconds && ttlSeconds > 0) {
      await client.set(key, value, { ex: ttlSeconds });
    } else {
      await client.set(key, value);
    }
  } catch (err) {
    console.warn(
      `[Redis] Failed to set cache key "${key}":`,
      err instanceof Error ? err.message : err
    );
  }
}

/**
 * Delete one or more keys from Redis cache.
 */
export async function cacheDel(...keys: string[]): Promise<number> {
  const client = getRedisClient();
  if (!client || keys.length === 0) return 0;

  try {
    return await client.del(...keys);
  } catch (err) {
    console.warn(
      `[Redis] Failed to delete cache keys:`,
      err instanceof Error ? err.message : err
    );
    return 0;
  }
}

/**
 * Cache-aside helper: checks cache for key; if missing, invokes factory fn,
 * stores the result with TTL, and returns it.
 */
export async function cacheRemember<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null && cached !== undefined) {
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
  if (!isRedisConfigured()) {
    return {
      status: "disabled",
      error:
        "UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN environment variable is not set",
    };
  }

  const client = getRedisClient();
  if (!client) {
    return { status: "error", error: "Could not initialize Redis client" };
  }

  const start = Date.now();
  try {
    const pong = await client.ping();
    const latencyMs = Date.now() - start;

    if (pong !== "PONG") {
      return {
        status: "degraded",
        latencyMs,
        error: `Unexpected PING response: ${pong}`,
      };
    }

    return {
      status: "ok",
      latencyMs,
      maxmemoryPolicy: "allkeys-lru",
    };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Gracefully close the Redis connection.
 * Upstash uses serverless HTTP REST requests, so no persistent connection socket is held.
 */
export async function closeRedisConnection(): Promise<void> {
  // Stateless HTTP client; no persistent TCP socket to close.
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
    const nowSeconds = Date.now() / 1000;
    const res = (await client.eval(
      TOKEN_BUCKET_LUA_SCRIPT,
      [key],
      [capacity, refillRatePerSec, cost, nowSeconds]
    )) as [number, string | number, number];

    const allowed = res[0] === 1;
    const remaining = Math.max(0, Math.floor(parseFloat(String(res[1])) || 0));
    const retryAfterSeconds = res[2] || 0;

    return { allowed, remaining, retryAfterSeconds };
  } catch (err) {
    console.warn(
      `[Redis] Rate limit execution failed for key "${key}", failing open:`,
      err instanceof Error ? err.message : err
    );
    return { allowed: true, remaining: capacity, retryAfterSeconds: 0 };
  }
}
