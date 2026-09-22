# Architecture & Layering Guide

This document describes Jobpilot's core architectural patterns, execution boundaries, reliability mechanisms, and background processing systems.

---

## 1. Request Flow & Three-Tier Layering

Jobpilot strictly enforces a unidirectional three-tier layering architecture:

```text
Server Action (or API Route Handler)
  │  • Validates input schema via Zod (`src/lib/validations/`)
  │  • Authenticates user session & checks authorization
  ▼
Service Layer (`src/services/`)
  │  • Implements core business logic, orchestration, and workflows
  │  • Coordinates between DALs, AI providers, and external adapters
  ▼
Data Access Layer (DAL) (`src/dal/`)
     • Exclusively executes Drizzle ORM queries and database mutations
     • Isolates SQL/table specifics from business logic
```

### Critical Rules
- **No Layer Skipping:** Route handlers and server actions never import the Drizzle database client or execute SQL directly; they must call into `src/services/`. The service layer never writes raw SQL queries directly; it must call into `src/dal/`.
- **Interchangeable Entry Points:** Server Actions (`"use server"`) and API route handlers (`route.ts`) are interchangeable entry points into the service layer. Choose whichever fits the caller, but keep internal business logic inside services.
- **Validation Boundary:** All input validation (via Zod schemas in `src/lib/validations/`) and authentication checks occur at the server action or route handler boundary before invoking the service layer. Services trust their arguments.

---

## 2. The Ok-Err Result Pattern

Jobpilot standardizes on the **ok-err** pattern for handling operational errors across execution boundaries:

```ts
import { ok, err } from "@/lib/result";

export type Result<T, E = string> = 
  | { ok: true; value: T } 
  | { ok: false; error: E };
```

### Conventions
- **Action & Route Boundary:** Every server action and route handler must return an `ok-err` shape instead of throwing uncaught exceptions to the caller.
- **No Competing Conventions:** Do not introduce secondary exception mechanisms (such as throwing custom `AppError` exceptions across server action boundaries).
- **Client Handling:** Client components calling server actions must explicitly check `result.ok` before accessing `result.value`:
  ```ts
  const res = await scoreJobAction({ jobId });
  if (!res.ok) {
    toast.error(res.error);
    return;
  }
  // Safe to use res.value
  ```
- **Internal Service Handling:** Services and DAL functions may throw internal exceptions or return `Result` types; however, the entry point (action or route handler) must catch/normalize into the standard `Result` response.

---

## 3. Action-Level Idempotency for Paid AI Operations

High-cost AI operations (`generate_tailored_resume`, `generate_tailored_cover_letter`, `run_scoring`) require strict idempotency protection against double-clicks, network timeouts, and automatic client retries.

### Database Schema (`idempotency_key`)

```ts
export const idempotencyKey = pgTable(
  "idempotency_key",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: text("key").notNull(), // Client-generated UUID
    userId: uuid("user_id").notNull(),
    action: text("action").notNull(), // e.g. "generate_tailored_resume"
    status: varchar("status", { length: 20 }).default("in_progress").notNull(), // in_progress | completed | failed
    resultRef: uuid("result_ref"), // Foreign key reference to generated entity ID
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("idempotency_key_unique_idx").on(t.userId, t.action, t.key),
  ],
);
```

### Server Action Execution Flow

1. **Insert `in_progress`:** After input validation and auth checks, attempt an atomic insert with `status: 'in_progress'`.
2. **Duplicate Conflict Check:** If the unique constraint on `(userId, action, key)` rejects the insert:
   - If `status === 'completed'`: Return the previously generated result immediately (`{ ok: true, value: existingResult }`).
   - If `status === 'in_progress'`: Return an in-flight ok-err response to prevent redundant background AI executions.
3. **Execute AI Work:** Call the AI provider and write resulting domain entities to the database.
4. **Mark `completed`:** Update `idempotency_key` row with `status: 'completed'`, set `resultRef` to the created entity ID, and set `updatedAt` to the current timestamp.
5. **Mark `failed` on Error:** If the AI call or database write fails, set `status: 'failed'` and update `updatedAt` to allow user retries.

*Note:* Inexpensive operations (e.g. updating pipeline stage) and read operations do not require idempotency keys.

---

## 4. Feature Flags Architecture

Feature flags enable controlled rollout and runtime experiments with per-user overrides.

- **Service Module:** `src/services/flags/is-enabled.ts` (re-exported via `src/services/flags/index.ts`).
- **Evaluation Order:**
  1. Check 60-second Redis cache (`flag:${flagKey}:${userId || "anon"}`).
  2. Query per-user override in `feature_flag_assignment` via `flagsDal.ts`.
  3. Fall back to global flag state in `feature_flag.enabledGlobally`.
- **Fail Closed:** Unknown flag keys or database/Redis connection errors always return `false`. They never throw and never return `true`.
- **Immediate Invalidation:** Updating or deleting a per-user override immediately deletes that user's Redis cache key (`cacheDel`). Toggling a global flag immediately deletes the anonymous/default cache entry.
- **Admin Management:** Accessible at `/dashboard/admin` with global toggles, user email search, and per-user override controls. Admin access is verified via `isAdmin(user)` checking the `ADMIN_USER_IDS` environment variable.
- **Key Flags:**
  - `"hybrid-scoring-v1"`: Gates whether sparse `bm25Rank` is computed in `scoreJobForResume()`. When disabled, scoring falls back to semantic-only vector ranking.

---

## 5. Adapter Circuit Breaker & Reliability

External job boards, scrapers, and ATS APIs can experience outages or rate limits. Jobpilot prevents cascading system failures via a PostgreSQL-backed circuit breaker.

- **State Table:** `adapter_circuit_breaker` (`src/services/db/schema/ops.ts`).
- **Service & DAL:** `src/services/reliability/circuit-breaker.ts` and `src/dal/circuit-breaker.dal.ts`.
- **Breaker Mechanics:**
  - **Failure Threshold:** 5 consecutive failures trips the breaker to `OPEN`.
  - **Exponential Backoff:** `min(30min, 1min * 2^consecutiveOpens)` (starting at 1 minute, capping at 30 minutes).
  - **Half-Open Probe:** `canAttempt()` automatically transitions from `OPEN` to `HALF_OPEN` once the backoff window elapses, permitting exactly one probe request through.
  - **Fast-Failing:** While the breaker is `OPEN`, requests fast-fail with `CIRCUIT_BREAKER_OPEN` without generating outbound network requests. Callers must preserve the remaining cooldown duration.

---

## 6. Background Queue & Async Processing (Inngest)

Long-running jobs, web scraping, email digest dispatches, and heavy background tasks run through **Inngest** (`src/inngest/`), served at `/api/inngest`.

### Core Rules
- **Zero Request-Path Blocking:** External ATS polling and web scraping take 10–30s across multiple sites. These operations must **never** be invoked synchronously inside user HTTP request paths (such as feed loads or page renders).
- **Scheduled Catalog Polling:** Handled by periodic Inngest cron (`scheduledJobFetch` running every 6 hours).
- **On-Demand Ingestion:** Dispatched via the typed Inngest event `job.fetch.requested`.
- **Typed Event Schemas:** Strongly typed using Inngest v4 `eventType()` in `src/inngest/events.ts`:
  - `job.fetch.requested`: On-demand source scraping/fetching.
  - `digest.email.scheduled`: Per-user email digest generation and dispatch.
  - `job.created`: Background AI match scoring when a new job is added.
- **Step Isolation:** Each external source and write is wrapped in `step.run()` so failures in one board don't halt other sources.
- **Local Dev Mode:** Ensure `INNGEST_DEV=1` is set in local development (or start via `pnpm inngest:dev`) to avoid production signing key requirements.

---

## 7. Documentation & Architectural Synchronization

Whenever code changes alter or extend the structural boundaries of the application, documentation must be updated in the same pull request or turn:

- **When Required:**
  - Introducing new route groups, pages, or layout hierarchies.
  - Adding or modifying database schemas, tables, or Drizzle relationships.
  - Creating new DAL modules, domain services, or external source adapters.
  - Introducing new background queues, crons, or caching systems.
- **Files to Update:**
  - [`AGENTS.md`](./AGENTS.md) (update project structure tree, locked-in principles, or tech stack).
  - The corresponding deep-dive guide in [`docs/`](./docs/).
