# Auth & Security Guide

This document describes authentication, authorization, content sanitization, and secret management in Jobpilot.

---

## 1. Authentication Architecture (better-auth)

Jobpilot uses **better-auth** for session handling, authentication plugins, and user identity.

- **Server Instance (`src/services/auth/auth.ts`):** Handles credential verification, session creation, passkey plugin, and database adapters. Marked with `import "server-only"`. Configures `session: { freshAge: 60 * 15 }` (15-minute freshness window), requires `BETTER_AUTH_SECRET` (min 32 chars) in production, and restricts `localhost` `trustedOrigins` to non-production environments.
- **Client Instance (`src/services/auth/auth-client.ts`):** Exports client hooks (`useSession`, `signIn`, `signOut`, passkey plugin) for use in Client Components.
- **Auth DAL (`src/dal/auth.dal.ts`):** Provides direct, type-safe queries for active sessions (`getActiveSessionsForUser`) and registered credentials (`getUserPasskeys`), avoiding brittle header-forwarding middleware in Server Components.
- **Strict Separation:** **Never** import `src/services/auth/auth.ts` or `src/dal/auth.dal.ts` into Client Components.
- **Route Handler:** Exposed at `src/app/api/auth/[...all]/route.ts`.

---

## 2. Authorization & Route Guards

### Server-Side Route Guarding
- Protected routes (e.g. `/dashboard/*`) check sessions server-side within layouts or page Server Components.
- Unauthenticated requests are redirected server-side using Next.js `redirect()` to prevent flashes of unauthenticated content.

### Action-Level & API Auth Verification
- Input validation and authentication checks must occur inside the server action or route handler **before** the service layer is invoked.
- `requireSession()` in `src/lib/auth-guard.ts` verifies the active session AND rejects suspended accounts (`user.banned === true` → `FORBIDDEN`).
- Protected AI/upload endpoints (`/api/resume/parse`, `/api/resume/extract`, `/api/jobs/[id]/*`) require `requireSession()`, enforce per-user rate limits, and enforce payload/file size bounds (5 MB max on `/api/resume/parse` with MIME/extension allowlist; 50,000 chars max on `/api/resume/extract`).
- Operational crawl endpoint `/api/crawl` requires `CRAWL_SECRET` via `Authorization: Bearer` or `x-crawl-secret` headers checked with `crypto.timingSafeEqual` (never query strings).

---

## 3. Role-Based Administration & Access Control

- **Better-Auth Admin Plugin:** Enabled via `admin()` plugin in `src/services/auth/auth.ts` and `adminClient()` in `src/services/auth/auth-client.ts`.
- **Database Schema:** `user` table includes `role` (`'user'` | `'admin'`), `banned`, `ban_reason`, and `ban_expires`. The `session` table includes `impersonated_by`.
- **Verification Helpers:** `isAdmin(user)` (`src/services/auth/admin.ts`) and `requireAdmin()` (`src/lib/auth-guard.ts`) enforce `user.role === "admin"` (and non-banned session status).
- **Scope:** Protects the administration console (`/dashboard/admin`) at both the layout level (`layout.tsx`) and inside every admin sub-page's data-loading Server Component (`page.tsx`, `users`, `billing`, `sources`, `ai-usage`, `flags`), plus all admin Server Actions. `getAdminUserDetails` omits raw `session.token` values.

---

## 4. Content Sanitization, SSRF & XSS Prevention

External job descriptions scraped from third-party websites or ATS boards may contain malicious HTML, CSS, or tracking scripts.

- **Server-Side HTML Sanitization (`src/lib/sanitize-job-html.ts`):** `sanitizeJobDescriptionHtml()` sanitizes job description HTML deterministically on the server with `cheerio` before passing it to client components, avoiding SSR/client hydration mismatches. Client fallback in `JobDescriptionSection.tsx` uses `DOMParser` with the identical strict allowlist (`<p>`, `<b>`, `<strong>`, `<i>`, `<em>`, `<ul>`, `<ol>`, `<li>`, `<br>`) and zero allowed attributes, stripping `<script>`, `<style>`, `<iframe>`, `<svg>`, forms, and `on*` handlers.
- **External URL Validation (`src/lib/safe-url.ts`):** `sanitizeExternalUrl()` enforces explicit `http:`/`https:` (or `https:`-only in production billing redirects) before rendering external job links, building digest email links, or redirecting `checkoutUrl`.
- **Digest Email Escaping:** `buildDigestHtml()` in `src/services/digest.service.ts` HTML-escapes all user and job fields and excludes private `manual` jobs.
- **SSRF Protection:** `resolveSafeUnJobsUrl()` in `src/services/adapters/unjobs.adapter.ts` restricts targets to `https://unjobs.org` / `https://www.unjobs.org` with `redirect: "error"`.
- **HTTP Security Headers (`next.config.ts`):** Sets `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and production `Strict-Transport-Security`.

---

## 5. Secrets Management & Environment Isolation

- **Never Commit Secrets:** API keys (Anthropic, Gemini, OpenAI, Vercel AI Gateway), database connection strings (required via `DATABASE_URL` with TLS certificate verification enabled by default), and `BETTER_AUTH_SECRET` must never be committed to git, logged to terminals, or output in AI chat.
- **Documentation:** When adding a new environment variable, immediately update `.env.example` with a placeholder key and description.
- **Browser Isolation:** Never prefix server-only secrets with `NEXT_PUBLIC_`. Server secrets must only be accessed within server-only modules, server actions, or route handlers.
