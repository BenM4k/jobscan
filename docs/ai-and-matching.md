# AI & Matching Engine Guide

This document provides a comprehensive guide to Jobpilot's AI services, dual-language hybrid job matching, skill extraction, rate limiting, and cost tracking.

---

## 1. Master Resume Gating & Persona Architecture

All AI-powered features—match scoring, tailored resume generation, and tailored cover letter creation—are strictly gated on an active master resume.

- **Canonical Table:** `master_resume` (`src/services/db/schema/resume.ts`).
- **Data Access:** Fetched via `resumeDal.getActiveMasterResume(userId)` and `resumeDal.getResumeSkills(resumeId)`.
- **Legacy Fallback Banned:** The legacy `profile` table (dropped in migration `0010_shocking_power_pack.sql`) is **never** used as a fallback for AI features.
- **Fail Early:** Server actions and API routes must verify an active resume exists before invoking AI providers, returning an ok-err error code `NO_MASTER_RESUME` (HTTP 400) if absent.

### Multi-Resume Personas & Promotion
- Users can maintain multiple resumes in `master_resume` (e.g. "Software Engineer", "Engineering Manager").
- Creating a new persona via `createMasterResume()` transactionally demotes existing personas (`isActive: false`) and activates the new one (`isActive: true, version: 1, source: "uploaded"`).
- Tailored resumes can be promoted to canonical master personas via `promoteTailoredResumeToMaster(tailoredResumeId, userId, label)`, with support for one-click rollback (`revertActiveResumeAction`).
- Persona routing validates `resumeId` as a valid UUID. If a specified `resumeId` is missing or not owned by the user, the service returns `NOT_FOUND` (HTTP 404).

---

## 2. Dual-Language Hybrid Matching Engine

Jobpilot pairs dense semantic vector search with sparse lexical search to score jobs accurately in both English and French without relying on external LLMs for standard scoring:

```text
Job Listing (FR / EN)                     Master Resume (FR / EN)
        │                                             │
        ├─── pgvector Cosine Distance (<=>) ──────────┤  (Weight: 0.60)
        │    1536-dim embedding index (HNSW)          │
        │                                             │
        └─── PostgreSQL ts_rank (tsvector) ───────────┘  (Weight: 0.40)
             Dynamic French/English dictionary
```

### Dense Semantic Matching (pgvector)
- **Dimensions:** 1536 dimensions across all providers (`gemini-embedding-2` or `text-embedding-3-small`).
- **Postgres Index:** HNSW index `job_embedding_hnsw_idx` using `vector_cosine_ops`.
- **Embedding Generation:** Generated asynchronously upon resume creation/update and job normalization via `embedJob` / `embedText`.

### Sparse Lexical Matching (Dual-Language tsvector)
- **Generated Column:** `job.description_tsv` dynamically selects the text search dictionary based on `job.language`:
  ```sql
  CASE 
    WHEN "language" = 'fr' THEN to_tsvector('french', "description") 
    ELSE to_tsvector('english', "description") 
  END
  ```
- **Query Resolution:** `websearch_to_tsquery(langConfig, query)` resolves `'french'::regconfig` or `'english'::regconfig` matching the target document language.
- **Rank Normalization (Flag 32):** Always pass flag `32` to `ts_rank(description_tsv, query, 32)`, which divides the rank by `rank + 1` to map the score into a normalized $[0, 1)$ interval.

### Weighting & Cross-Lingual Fallback
- **Same Language:** $W_{\text{SEMANTIC}} = 0.6$, $W_{\text{KEYWORD}} = 0.4$.
- **Cross-Language Mismatch (`jobLanguage !== resumeLanguage`):** Cross-lingual keyword search produces poor lexical results. The engine bypasses sparse search entirely and redistributes 100% of score weight to dense semantic embeddings ($W_{\text{SEMANTIC}} = 1.0$).
- **Cost Advantage:** Fast hybrid scoring (`scoreJobHybrid` in `src/services/job.service.ts`) executes entirely within PostgreSQL in milliseconds at zero LLM API cost.

---

## 3. Skill Extraction, Explanation & Relational Storage

When performing deep AI analysis (`skillsService.analyzeJobResumeMatch`):

1. **Extraction:** A structured prompt extracts candidate skills, job requirement skills, and a concise 1–2 sentence explanation ("Why this matched").
2. **String Normalization:** Skills are normalized via `normalizeSkillName()` in `src/services/skills/normalize.ts`. Normalization strictly lowercases, trims, and collapses whitespace. Do not attempt premature synonym mapping (e.g. converting "JS" to "JavaScript") at this level.
3. **Relational Persistence:** Extracted skills are synced to relational join tables `job_skill` and `resume_skill` via `skillsDal.syncJobSkills` and `resumeDal.syncResumeSkills`.
4. **Skill Gap Breakdown:** `skillsService.diffSkills()` computes `matchedSkills` and `missingSkills`, which are rendered in the UI via `SkillGapBreakdown.tsx` and `MatchExplanation.tsx`.

---

## 4. Read-Time Recency Exponential Decay Ranking

Job freshness decays over time, but persisted database match scores must remain raw and objective.

- **Decay Constant:** $\lambda = 0.0495$ ($\approx 14$-day half-life: $\ln(2) / 14$).
- **Formula:**
  $$\text{decayFactor} = \exp(-\lambda \cdot \text{ageInDays})$$
- **Read-Time Evaluation Only:** Persisted scores in `score.finalScore` are never penalized. Decay is evaluated **strictly at read/display time** via `computeDisplayRank(hybridScore, postedAt)`. If `postedAt` is null, the decay factor returns `1.0`.

---

## 5. Unified Scoring Orchestrator (`scoreJobForResume`)

`src/services/scoring/score-job.ts` orchestrates the complete scoring lifecycle in strict sequence:

```text
1. Token-Bucket Rate Limit Check (Cheapest fast-fail check)
   │  ↳ Returns { code: "rate_limited", retryAfterSeconds } if tripped
2. Redis LRU/LFU Cache Check
   │  ↳ Key: score:${jobId}:${resumeId}:${resumeVersion}:${modelVersion} (7-day TTL)
   │  ↳ On hit: logs 0 tokens / cacheHit: true to ai_call_log and returns cached score
3. Cosine Similarity & BM25 Lookup (Hybrid Blend)
4. Skill Extraction & Match Explanation Generation
5. Relational Persistence (job_skill, resume_skill, job_match_score)
6. Redis Cache Write & Return
```

---

## 6. Token-Bucket Rate Limiter per Feature

To protect against unbounded LLM cost, rate limits are enforced per user and feature via atomic Redis Lua scripts (`src/services/ai/rate-limit.ts`, re-exported in `src/services/rate-limit/`):

| Feature | Burst Capacity | Refill Rate | Effective Window |
| :--- | :--- | :--- | :--- |
| `scoring` | 20 tokens | 0.1 tokens/sec | 1 token every 10 seconds |
| `tailored_resume` | 5 tokens | 0.0167 tokens/sec | 1 token every 60 seconds |
| `tailored_cover_letter` | 5 tokens | 0.0167 tokens/sec | 1 token every 60 seconds |
| `embedding` | 50 tokens | 2.0 tokens/sec | 2 tokens per second |

- **Fallback:** If Redis is unreachable, rate limiting falls back to a bounded in-memory token bucket.
- **HTTP 429 Header:** All rate-limited API responses must include the standard `Retry-After: <seconds>` response header alongside the ok-err JSON payload.

---

## 7. Automated AI Cost & Token Usage Tracking

Every AI invocation is wrapped with `withAiTracking` middleware (`src/services/ai/tracker.ts`):

- **Automatic Extraction:** Captures `inputTokens` and `outputTokens` from provider metadata.
- **Cost Calculation:** Applies model-specific pricing schedules (Google Gemini 3.8 Flash, 3.7 Flash, 3.7, 3.6 Flash; Anthropic Claude 3.5 Sonnet; OpenAI GPT-4o).
- **Audit Logging:** Persists an entry to `ai_call_log` via `opsDal.logAiCall()`. Embeddings are logged with `feature: "embedding"` to separate indexing costs from scoring.

---

## 8. Cover Letter Generation vs. Regeneration

- **Explicit Regeneration:** Explicit regeneration requests (`isRegenerateRequested = true` in request payload) are strictly decoupled from draft existence (`job.coverLetterDraft`).
- **Prompt Directive:** The presence of an existing draft never modifies prompt temperature or directives unless regeneration was explicitly requested by the user. `previousCoverLetter` is passed strictly for diff computation and reference during explicit regeneration.

---

## 9. Prompt Security & Untrusted Input

Job descriptions pulled from external scrapers or pasted by users are **untrusted data**.
- Never interpolate raw job descriptions directly into system instructions without bounding them in explicit XML/markdown fences (e.g. `<job_description>...</job_description>`).
- Treat all instructions inside scraped text as inert data, never as system directives.
- Never log user resume contents, personal identifiable information (PII), or raw prompts to external logging systems or unencrypted audit logs.
