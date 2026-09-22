# Database & Models Guide

This document describes Jobpilot's database architecture, Drizzle ORM conventions, table schemas, PostgreSQL extensions, and DAL design.

---

## 1. Drizzle ORM Architecture & Layering

Jobpilot uses **Drizzle ORM** with PostgreSQL. Schema definitions are organized modularly by domain under `src/services/db/schema/` and re-exported from `src/services/db/schema/index.ts`.

### Strict DAL Isolation
- **All database queries live in `src/dal/`:** Neither server actions, route handlers, nor the service layer may import the Drizzle database client (`src/services/db/index.ts`) directly.
- **Why:** Isolating queries inside the DAL makes the service layer mockable, testable, and prevents leaky query abstractions across feature boundaries.
- **Query APIs:**
  - Use Drizzle's **Relational Query API** (`db.query.table.findMany({ with: { ... } })`) for read paths requiring nested relations (e.g. pipeline entries with job and score).
  - Use the **SQL-like Query Builder** (`db.select()`, `db.insert()`, `db.update()`) for writes, atomic upserts, and complex conditions.

---

## 2. Canonical Database Schemas

| Table | File | Purpose |
| :--- | :--- | :--- |
| `job` | `schema/pipeline.ts` | Normalized canonical job postings with SimHash, language, embeddings, and full-text TSV. |
| `raw_job_payload` | `schema/pipeline.ts` | Step 1 raw, untouched responses from external source adapters and scrapers. |
| `job_source_ref` | `schema/pipeline.ts` | Many-to-one cross-source syndicate references linking external IDs to canonical jobs. |
| `pipeline_entry` | `schema/pipeline.ts` | User job applications and pipeline tracking stages (`saved`, `applied`, `interviewing`, etc.). |
| `master_resume` | `schema/resume.ts` | Canonical resume personas with versioning, 1536-dim embeddings, and active status. |
| `job_skill` / `resume_skill` | `schema/resume.ts` | Relational join tables storing normalized extracted skills. |
| `job_match_score` | `schema/scoring.ts` | Persisted raw match scores, semantic/BM25 breakdown, and explanation. |
| `idempotency_key` | `schema/ops.ts` | Client UUID tracking preventing duplicate paid AI mutation executions. |
| `adapter_circuit_breaker` | `schema/ops.ts` | Adapter health tracking, failure counters, and backoff states. |
| `ai_call_log` | `schema/ops.ts` | Telemetry audit log recording token counts, latency, and estimated cost per call. |
| `feature_flag` / `feature_flag_assignment` | `schema/ops.ts` | Global flag toggles and per-user overrides. |
| `user` / `session` / `account` | `schema/auth.ts` | better-auth tables for identity, credentials, and session management. |

---

## 3. Legacy Schema Isolation

- **Migration `0010_shocking_power_pack.sql`** permanently dropped the legacy `jobs`, `profile`, and `deleted_jobs` tables.
- **Transitional File `src/services/db/schema/legacy.ts`:** Retained solely for `profile.dal.ts` during transitional legacy `/dashboard/profile` UI usage.
- **Do Not Re-Export:** `schema/legacy.ts` is intentionally **NOT** exported from `schema/index.ts`. New features must never import or bind to legacy schema.

---

## 4. PostgreSQL Extensions & Technical Notes

### `pgvector` & 1536-Dimensional Embeddings
- The database enables the `vector` extension.
- Both `master_resume.embedding` and `job.embedding` are configured as `vector(1536)` and indexed with HNSW (`job_embedding_hnsw_idx` using `vector_cosine_ops`).
- **Drizzle Literal Formatting Workaround:** Drizzle currently lacks native typed array binding for pgvector columns. When writing vectors via Drizzle, format the array as a string literal:
  ```ts
  // Vector update workaround in resume.dal.ts
  const vectorString = `[${embedding.join(",")}]`;
  await db.update(masterResume)
    .set({ embedding: sql`${vectorString}::vector` })
    .where(eq(masterResume.id, resumeId));
  ```

### Full-Text Search (`tsvector`) & Dual-Language Indexing
- `job.description_tsv` is a PostgreSQL generated column branching on `job.language`:
  ```sql
  GENERATED ALWAYS AS (
    CASE 
      WHEN "language" = 'fr' THEN to_tsvector('french', "description")
      ELSE to_tsvector('english', "description")
    END
  ) STORED
  ```
- Lexical ranking queries must pass normalization flag `32` to `ts_rank` to scale results into a $[0, 1)$ interval.

### Trigram Search (`pg_trgm`) & Bitwise XOR (`bit_count`)
- `pg_trgm` provides fast fuzzy searching over job titles and company names.
- PostgreSQL bitwise XOR (`#`) and `bit_count` calculate Hamming distance for 64-bit SimHash deduplication. SimHash values in the DB are stored as signed BigInt strings.

---

## 5. Schema Conventions & Migrations

- **Keys & Timestamps:** Every table must define an explicit `id` (UUID default random), `createdAt` (timestamp default now), and `updatedAt` (timestamp with automatic or application update).
- **Migration Workflow:**
  1. Modify schemas in `src/services/db/schema/*.ts`.
  2. Inspect changes with `pnpm drizzle-kit generate`.
  3. Apply migrations using the established repository script (`pnpm db:migrate` or `drizzle-kit migrate`).
  4. Never hand-edit previously applied migration SQL files.
