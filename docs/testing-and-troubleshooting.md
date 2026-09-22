# Testing & Troubleshooting Guide

This document covers Jobpilot's testing infrastructure, execution commands, quality gates, and known architectural traps and gotchas.

---

## 1. Testing Infrastructure & Execution

Jobpilot centralizes test suites under `src/test/`:

- **Unit Tests (`src/test/unit/`):** Fast, standalone tests mocking external calls (e.g. `feature-flags.unit.test.ts`, `rate-limit.unit.test.ts`, `score-job.unit.test.ts`, `score-cache.unit.test.ts`, `skills.unit.test.ts`, `ranking-decay.unit.test.ts`).
- **Integration Tests (`src/test/integration/`):** Database-backed and multi-service flows (`*.integration.test.ts`).

### Standalone Runner Command
Modules that import `server-only` (such as `job.service.ts` or `digest.service.ts`) throw runtime errors when imported by standard `tsx` scripts. You **must** pass `--conditions=react-server`:

```bash
NODE_OPTIONS='--conditions=react-server' npx tsx src/test/unit/score-job.unit.test.ts
```

### Pre-Commit Quality Gates
Before considering any task or PR complete, run:
1. **Typecheck:** `pnpm tsc --noEmit`
2. **Lint:** `pnpm lint`
3. **Targeted Tests:** Run the specific test files covering touched code.

---

## 2. Common Gotchas & Traps (Read Before Coding)

### 1. Master Resume Requirement for AI
- All scoring, resume tailoring, and cover letter generation operations fail if no active resume exists in `master_resume`.
- Testing with an already-seeded user can give a false sense of success. Always verify the fresh-user / no-resume path.

### 2. `profile.dal.ts` vs `resume.dal.ts`
- The transitional `/dashboard/profile` UI currently mirrors into `profileDal`, but all pipeline, scoring, and AI features strictly use `resumeDal` and `master_resume`.
- Never import or route new features through `profileDal`.

### 3. Drizzle pgvector String Literal Formatting
- Drizzle does not currently have native typed array binding for pgvector columns.
- Updating vector columns (`master_resume.embedding`, `job.embedding`) requires passing a formatted string literal `[${embedding.join(",")}]` cast via `sql` or `as any`.

### 4. Google Gemini Embeddings Syntax
- In `@ai-sdk/google`, `embedding()` does not accept dimension parameters in the constructor.
- You must supply `providerOptions: { google: { outputDimensionality: 1536 } }` within the options passed to `embed()`.

### 5. Two-Step Ingestion Separation
- Never squash raw ingestion (`raw_job_payload`) and normalization (`job`) into a single DB call or transaction.
- Raw untouched storage (Step 1) must remain separate from normalization (Step 2) to ensure re-playability.

### 6. Atomic Ingestion Upserts (No Check-Then-Insert)
- Never write `if (!exists) insert()` during adapter ingestion. Overlapping fetch cycles will race and fail unique constraints.
- Always use `.onConflictDoUpdate()` targeting `(source, external_id)`.

### 7. Paid AI Operations Must Use Idempotency Keys
- Paid AI calls (`generate_tailored_resume`, `generate_tailored_cover_letter`, `run_scoring`) must be wrapped in `idempotency_key` transactions.
- Running without client-minted keys allows double-clicks and network retries to trigger duplicate billing.

### 8. Circuit Breaker Fast-Fails
- When an external ATS or board trips the circuit breaker, calls return `CIRCUIT_BREAKER_OPEN`.
- Do not mask this as a generic 500 error; return the remaining backoff duration cleanly to the caller.

### 9. SimHash Signed 64-Bit Integer Overflow
- SimHash fingerprints stored in `job.simhash` must be valid signed 64-bit BigInt strings to prevent PostgreSQL numeric-to-bigint overflow errors.

### 10. `INNGEST_DEV=1` for Local Development
- Inngest v4 defaults to cloud mode and requires signing keys.
- In local development, ensure `INNGEST_DEV=1` is set in your environment (or run `pnpm inngest:dev`) to serve functions at `/api/inngest` without errors.

### 11. Dual-Language Search: ts_rank Normalization Flag 32
- Always pass normalization flag `32` to `ts_rank(description_tsv, query, 32)` to scale lexical scores into $[0, 1)$.
- Dynamically resolve `'french'::regconfig` or `'english'::regconfig` matching the target document language.
- Never run cross-lingual keyword searches; redistribute 100% of weight to dense vector similarity instead.

### 12. Freshness Decay Is Read-Time Only
- Freshness decay ($\lambda = 0.0495$, 14-day half-life) must only be calculated at read/display time via `computeDisplayRank`.
- Never modify or penalize persisted scores in `job_match_score.finalScore`.

### 13. Rate-Limit Check Ordering
- Token-bucket rate limiting (`checkRateLimit(userId, "scoring")`) must run as **step 1** at the very top of `scoreJobForResume()`, before checking Redis score caches.
- Rejecting on rate limits must be the cheapest possible execution path.

### 14. Skill Normalization Boundary
- `normalizeSkillName()` in `src/services/skills/normalize.ts` strictly lowercases, trims, and collapses whitespace.
- Avoid premature synonym mapping (e.g. "JS" -> "JavaScript") to preserve exact lexical tokens for graph mapping.

### 15. Local-Only Assets (.agents & skills-lock.json)
- Custom IDE agent configs, prompt skills, and `skills-lock.json` are local-only assets.
- Ensure they remain in `.gitignore` and are never committed to git.
