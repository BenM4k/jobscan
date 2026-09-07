# Redis Provisioning & Configuration Guide

Jobpilot uses Redis for fast key-value caching, query caching, rate limiting, and temporary state storage.

This guide outlines how to provision and configure Redis in production (via the Vercel Marketplace) and locally for development.

---

## 1. Architectural Architecture & Rules

- **Strict Client Encapsulation**: As mandated in `AGENTS.md`, `src/services/cache/redis-client.ts` is the **only** file in the codebase permitted to import the Redis SDK (`ioredis`). All other services, actions, and DALs import helper methods (`cacheGet`, `cacheSet`, `cacheRemember`, `cacheDel`, `getRedisClient`) from `@/services/cache/redis-client`.
- **Eviction Policy**: Redis is configured as a cache with eviction policy **`allkeys-lru`** (Least Recently Used across all keys). When memory limit is reached, Redis evicts the least recently used keys to make room for new writes instead of failing writes with out-of-memory errors.
- **Resilience**: Redis operations fail gracefully. If Redis is unavailable or offline, cache reads return `null` and cache writes warn without crashing user-facing request flows.

---

## 2. Production Provisioning (Vercel Marketplace)

You can provision Redis on Vercel using either **Redis Cloud** (by Redis, Inc.) or **Upstash Redis**.

### Option A: Redis Cloud (Recommended)

1. **Add via Vercel Marketplace**:
   - In the [Vercel Dashboard](https://vercel.com/dashboard), navigate to your **Jobpilot** project.
   - Go to **Integrations** or **Storage** and search for **Redis Cloud** (by Redis, Inc.).
   - Click **Add Integration** and select your project.
   - Choose your database region (match your Vercel deployment region, e.g., `iad1` / US East or `fra1` / EU Frankfurt).
2. **Environment Variables**:
   - Redis Cloud automatically exposes `REDIS_URL` in your Vercel environment variables:
     ```env
     REDIS_URL=rediss://default:<password>@<host>:<port>
     ```
   - Ensure `REDIS_URL` is enabled for **Production**, **Preview**, and **Development** environments.
3. **Configure `allkeys-lru` Eviction Policy**:
   - Log into the [Redis Cloud Console](https://app.redislabs.com/).
   - Select your subscription and database.
   - Under **Configuration** → **Memory Management**, find **Eviction Policy**.
   - Set the policy to **`allkeys-lru`**.
   - Click **Save**.

---

### Option B: Upstash Redis

1. **Add via Vercel Storage**:
   - In your Vercel Project Dashboard, navigate to **Storage**.
   - Click **Create Database** and select **Redis (Upstash)**.
   - Select the primary region closest to your serverless functions and connect the database to your project.
2. **Environment Variables**:
   - Upstash creates multiple variables. The `redis-client.ts` wrapper uses standard Redis connection string:
     ```env
     REDIS_URL=rediss://default:<password>@<endpoint>.upstash.io:6379
     ```
   - If Vercel sets `KV_URL` or custom names, ensure `REDIS_URL` points to the `rediss://` URI.
3. **Configure `allkeys-lru` Eviction Policy**:
   - Open the [Upstash Console](https://console.upstash.com/).
   - Select your database.
   - Go to **Details** → **Eviction**.
   - Enable Eviction and select **`allkeys-lru`**.

---

## 3. Local Development (Docker Compose)

The repository provides a pre-configured Redis container in `docker-compose.yml`:

```yaml
  redis:
    image: redis:7-alpine
    container_name: jobpilot-redis
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
```

### Starting Redis Locally:

```bash
# Start Postgres and Redis together
docker compose up -d

# Or start only Redis
docker compose up -d redis
```

### Connecting Local Environment:

In `.env.local`:
```env
REDIS_URL=redis://localhost:6379
REDIS_MAXMEMORY_POLICY="allkeys-lru"
```

Verify connection:
```bash
docker exec -it jobpilot-redis redis-cli ping
# Response: PONG

docker exec -it jobpilot-redis redis-cli config get maxmemory-policy
# Response:
# 1) "maxmemory-policy"
# 2) "allkeys-lru"
```

---

## 4. Usage in Code

Always import cache functions from `@/services/cache/redis-client`:

```typescript
import {
  cacheGet,
  cacheSet,
  cacheRemember,
  cacheDel,
  getRedisHealth,
} from "@/services/cache/redis-client";

// Simple Get / Set
await cacheSet("job:123:summary", summaryData, 3600); // 1 hour TTL
const cached = await cacheGet<JobSummary>("job:123:summary");

// Cache-Aside Pattern
const jobDetails = await cacheRemember(`job:${jobId}`, 1800, async () => {
  return await jobsDal.findJobById(jobId);
});

// Invalidate
await cacheDel(`job:${jobId}`);

// Health check
const health = await getRedisHealth();
console.log(health.status, health.maxmemoryPolicy, health.latencyMs);
```
