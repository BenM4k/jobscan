import fs from "node:fs";
import path from "node:path";
import * as redisClient from "@/services/cache/redis-client";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runCacheUnitTests() {
  console.log("Running Redis Cache & SDK Isolation unit tests...\n");

  // 1. Verify single point of import for ioredis across the entire codebase
  const srcDir = path.resolve(process.cwd(), "src");
  const foundImports: string[] = [];

  function scanDirectory(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, "utf-8");
        if (/from\s+['"]ioredis['"]|require\(['"]ioredis['"]\)/.test(content)) {
          foundImports.push(path.relative(process.cwd(), fullPath));
        }
      }
    }
  }

  scanDirectory(srcDir);
  console.log("Files importing ioredis:", foundImports);

  assert(
    foundImports.length === 1,
    `Expected exactly 1 file to import ioredis, but found ${foundImports.length}: ${foundImports.join(", ")}`
  );
  assert(
    foundImports[0] === "src/services/cache/redis-client.ts",
    `Expected src/services/cache/redis-client.ts to be the sole importer of ioredis, but found ${foundImports[0]}`
  );
  console.log("✓ SDK Isolation: src/services/cache/redis-client.ts is the ONLY file importing ioredis");

  // 2. Verify exports in src/services/cache/redis-client.ts
  const requiredFunctions = [
    "getRedisClient",
    "cacheGet",
    "cacheSet",
    "cacheDel",
    "cacheRemember",
    "ensureMaxMemoryPolicy",
    "getRedisHealth",
    "closeRedisConnection",
  ];

  for (const fn of requiredFunctions) {
    assert(
      typeof (redisClient as Record<string, unknown>)[fn] === "function",
      `Expected ${fn} to be a function in @/services/cache/redis-client`
    );
  }
  console.log("✓ Exports check: all required cache methods and health checks are exported");

  // 3. Verify graceful degradation when REDIS_URL is not set
  const originalRedisUrl = process.env.REDIS_URL;
  delete process.env.REDIS_URL;

  const healthDisabled = await redisClient.getRedisHealth();
  assert(
    healthDisabled.status === "disabled",
    `Expected health status 'disabled' when REDIS_URL is unset, got '${healthDisabled.status}'`
  );

  const getNull = await redisClient.cacheGet("test:missing:key");
  assert(getNull === null, "cacheGet should return null when REDIS_URL is not set");

  const remembered = await redisClient.cacheRemember("test:compute", 60, async () => {
    return { calculated: 42 };
  });
  assert(
    remembered.calculated === 42,
    "cacheRemember should invoke and return factory value even when Redis is offline/disabled"
  );
  console.log("✓ Graceful degradation: cache helpers gracefully bypass when Redis is unconfigured");

  // Restore REDIS_URL if it was set
  if (originalRedisUrl) {
    process.env.REDIS_URL = originalRedisUrl;
  }

  console.log("\nAll Redis cache & isolation tests passed successfully! 🎉");
}

runCacheUnitTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
