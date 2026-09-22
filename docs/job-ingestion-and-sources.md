# Job Ingestion & Sources Guide

This document details Jobpilot's job aggregation architecture, adapter design, two-step ingestion pipeline, SimHash cross-source deduplication, and background synchronization mechanisms.

---

## 1. Supported Job Sources

Jobpilot aggregates opportunities across several distinct channels:

| Category | Sources | Implementation Location | Notes |
| :--- | :--- | :--- | :--- |
| **ATS On-Demand Adapters** | Ashby, Greenhouse, Lever, RemoteOK | `src/services/adapters/` | Standardized JSON/API interfaces. |
| **Local / Scraped Boards** | CongoJob, Emploi.cd, FECRDC, UNJobs, ReliefWeb | `src/services/crawler/sources/` | HTML scraping and semi-structured feeds (DRC and regional focus, expanding globally). |
| **Manual User Submissions** | Direct entry | `src/app/dashboard/add-job/` | Directly maps to canonical `Job` schema without adapter fetch. |

All source adapters inherit from `BaseJobSourceAdapter` in `src/services/adapters/base.ts`, implementing `saveRaw()`, `normalizeFromStored()`, and `ingest()`.

---

## 2. Two-Step Ingestion Pipeline

To ensure replayability, debugging auditability, and resilience against upstream schema changes, Jobpilot separates ingestion into **two sequential database operations**:

```text
Step 1: Raw Ingestion (DB Call 1)
  │  • Untouched external payload written directly to `raw_job_payload`
  │  • No field extraction or mutation permitted
  ▼
Step 2: Normalization & SimHash Dedup (DB Call 2)
     • Read untouched payload from `raw_job_payload`
     • Map fields into canonical `Job` representation
     • Compute 64-bit SimHash fingerprint
     • Check Hamming distance against existing catalog (k <= 3)
     • If duplicate found: link `job_source_ref` to existing canonical `job.id`
     • If unique: upsert new canonical `job` row with persisted `simhash`
     • Update `raw_job_payload.normalized_job_id = job.id`
```

### Critical Rules
- **Strictly Two Separate Calls:** Never combine Step 1 and Step 2 into a single query, transaction, or un-sequenced `Promise.all`. The separation ensures that if normalization logic fails or schema requirements change, raw payloads can be replayed safely.
- **Idempotent Atomic Upserts:** The tuple `(source, external_id)` is a unique natural key across `raw_job_payload`, `job`, and `job_source_ref`. Never perform "check-then-insert" queries, which race during parallel fetches. Always use atomic upserts:
  ```ts
  .onConflictDoUpdate({
    target: [rawJobPayload.source, rawJobPayload.externalId],
    set: { payload, updatedAt: new Date() },
  })
  ```

---

## 3. Cross-Source SimHash Deduplication

Different job boards frequently syndicate the exact same posting with minor formatting, tracking tokens, or whitespace variations. Jobpilot deduplicates across sources using 64-bit SimHash fingerprints.

### Algorithm & Fingerprinting
1. **Normalization & Shingling:** `src/lib/simhash.ts` uses `@counterrealist/simhash` (64-bit SipHash-2-4 with 3-character n-gram shingling and bit voting). It normalizes HTML, whitespace, and casing across `title + company + description`.
2. **Signed 64-Bit Integer:** SimHash produces a signed 64-bit BigInt string (`signedBigInt`). Persisted values in `job.simhash` must be valid signed 64-bit BigInt strings to prevent numeric-to-bigint overflow errors in PostgreSQL.

### Postgres Hamming Distance Query
Before inserting a new canonical `job`, `jobsDal.findJobBySimhash()` queries the catalog using PostgreSQL bitwise XOR (`#`) and `bit_count`:

```sql
SELECT * FROM job
WHERE simhash IS NOT NULL
  AND bit_count((simhash::bigint # target::bigint)::bit(64)) <= 3
ORDER BY bit_count((simhash::bigint # target::bigint)::bit(64)) ASC
LIMIT 1;
```

### Reference Linking & Consolidation
- **If Hamming Distance $k \le 3$ (~95%+ similarity):**
  - A duplicate exists. Do not create a new canonical `job` row.
  - Link `job_source_ref` pointing to the existing `canonicalJob.id`.
  - Update `raw_job_payload.normalized_job_id = canonicalJob.id`.
  - Attach the job to the user's pipeline if `userId` was supplied in the ingestion context.
- **If $k > 3$ or No Match Found:**
  - Insert the canonical `job` row with `simhash` persisted.
  - Create the `job_source_ref` link.
  - Asynchronously trigger fire-and-forget vector embedding generation (`embedJob`).

---

## 4. Background Syncing & Inngest Execution

External fetches can take 10–30 seconds across multiple sites. To keep UI interactions responsive, fetching is completely decoupled from request paths:

- **Periodic Catalog Polling:** Inngest cron function `scheduledJobFetch` executes every 6 hours, sweeping active adapters and scrapers.
- **On-Demand User Ingestion:** When a user triggers a board refresh or imports a URL, an asynchronous Inngest event `job.fetch.requested` is emitted.
- **No Synchronous Fetching in Dashboard:** The dashboard data loader (`getDashboardFeedData` in `dashboard.service.ts`) queries the database catalog only. It never initiates network fetches or crawler scrapers.

---

## 5. Circuit Breaker Integration

All adapter fetches (`fetchRaw()`) and crawler tasks are protected by the database-backed circuit breaker (`src/services/reliability/circuit-breaker.ts`):

- Consecutive network or parsing failures trip the breaker to `OPEN`.
- Once open, further fetch attempts fast-fail with `CIRCUIT_BREAKER_OPEN` until the backoff window expires.
- Fast failures must be returned cleanly to callers without triggering cascading server errors.

---

## 6. How to Add a New Job Source

When adding a new job board or ATS source:

1. **Categorize:** Decide if it belongs in `src/services/adapters/` (API-driven / on-demand ATS) or `src/services/crawler/sources/` (periodic scraper / regional board).
2. **Implement Base Adapter:** Extend `BaseJobSourceAdapter` in `src/services/adapters/base.ts`.
3. **Register Source Enum:** Add the new source identifier to `jobSourceEnum` in `src/services/db/schema/pipeline.ts`.
4. **Static Language Mapping:** Map the new source to its primary language (`en` or `fr`) in `src/services/db/schema/pipeline.ts` for dual-language hybrid search.
5. **Add Tests:** Write unit tests using mocked responses in `src/test/unit/` to verify raw payload saving, normalization, and SimHash computation.
