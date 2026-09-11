import fs from "node:fs";
import path from "node:path";
import * as redisClient from "@/services/cache/redis-client";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runCacheUnitTests() {
  console.log("Running Upstash Redis Cache & SDK Isolation unit tests...\n");

  // 1. Verify single point of import for @upstash/redis across the entire codebase
  const srcDir = path.resolve(process.cwd(), "src");
  const foundUpstashImports: string[] = [];
  const foundIoRedisImports: string[] = [];

  function scanDirectory(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, "utf-8");
        if (/from\s+['"]@upstash\/redis['"]|require\(['"]@upstash\/redis['"]\)/.test(content)) {
          foundUpstashImports.push(path.relative(process.cwd(), fullPath));
        }
        if (/from\s+['"]ioredis['"]|require\(['"]ioredis['"]\)/.test(content)) {
          foundIoRedisImports.push(path.relative(process.cwd(), fullPath));
        }
      }
    }
  }

  scanDirectory(srcDir);
  console.log("Files importing @upstash/redis:", foundUpstashImports);

  assert(
    foundUpstashImports.length === 1,
    `Expected exactly 1 file to import @upstash/redis, but found ${foundUpstashImports.length}: ${foundUpstashImports.join(", ")}`
  );
  assert(
    foundUpstashImports[0] === "src/services/cache/redis-client.ts",
    `Expected src/services/cache/redis-client.ts to be the sole importer of @upstash/redis, but found ${foundUpstashImports[0]}`
  );
  assert(
    foundIoRedisImports.length === 0,
    `ioredis should no longer be imported anywhere, but found: ${foundIoRedisImports.join(", ")}`
  );
  console.log("✓ SDK Isolation: src/services/cache/redis-client.ts is the ONLY file importing @upstash/redis directly");

  // 2. Verify exports in src/services/cache/redis-client.ts
  assert(
    Boolean(redisClient.redis),
    "Expected 'redis' instance to be exported from @/services/cache/redis-client"
  );
  console.log("✓ Single configured redis instance exported directly");

  const requiredFunctions = [
    "getRedisClient",
    "cacheGet",
    "cacheSet",
    "cacheDel",
    "cacheRemember",
    "ensureMaxMemoryPolicy",
    "getRedisHealth",
    "closeRedisConnection",
    "executeTokenBucketRateLimit",
  ];

  for (const fn of requiredFunctions) {
    assert(
      typeof (redisClient as Record<string, unknown>)[fn] === "function",
      `Expected ${fn} to be a function in @/services/cache/redis-client`
    );
  }
  console.log("✓ Exports check: all required cache methods, rate limiter, and health checks are exported");

  // 3. Verify maxmemory-policy reporting
  const policyCheck = await redisClient.ensureMaxMemoryPolicy();
  assert(
    policyCheck.policy === "allkeys-lru",
    `Expected policy 'allkeys-lru', got '${policyCheck.policy}'`
  );
  console.log("✓ Policy check: allkeys-lru confirmed for Upstash dashboard management");

  // 4. Verify graceful degradation when Upstash env vars are not set
  const origUrl = process.env.UPSTASH_REDIS_REST_URL;
  const origToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;

  const healthDisabled = await redisClient.getRedisHealth();
  assert(
    healthDisabled.status === "disabled",
    `Expected health status 'disabled' when Upstash env vars are unset, got '${healthDisabled.status}'`
  );

  const getNull = await redisClient.cacheGet("test:missing:key");
  assert(getNull === null, "cacheGet should return null when Upstash is not configured");

  const remembered = await redisClient.cacheRemember("test:compute", 60, async () => {
    return { calculated: 42 };
  });
  assert(
    remembered.calculated === 42,
    "cacheRemember should invoke and return factory value even when Redis is offline/disabled"
  );
  console.log("✓ Graceful degradation: cache helpers gracefully bypass when Redis is unconfigured");

  // Restore env if it was set
  if (origUrl) process.env.UPSTASH_REDIS_REST_URL = origUrl;
  if (origToken) process.env.UPSTASH_REDIS_REST_TOKEN = origToken;

  console.log("\nAll Upstash Redis cache & isolation tests passed successfully! 🎉");
}

runCacheUnitTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
