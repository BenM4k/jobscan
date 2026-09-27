# Auth & Security Guide

This document describes authentication, authorization, content sanitization, and secret management in Jobpilot.

---

## 1. Authentication Architecture (better-auth)

Jobpilot uses **better-auth** for session handling, authentication plugins, and user identity.

- **Server Instance (`src/services/auth/auth.ts`):** Handles credential verification, session creation, passkey plugin, and database adapters. Marked with `import "server-only"`. Configures `session: { freshAge: 0 }` to avoid session staleness errors on valid sessions.
- **Client Instance (`src/services/auth/auth-client.ts`):** Exports client hooks (`useSession`, `signIn`, `signOut`, passkey plugin) for use in Client Components.
- **Auth DAL (`src/dal/auth.dal.ts`):** Provides direct, type-safe queries for active sessions (`getActiveSessionsForUser`) and registered credentials (`getUserPasskeys`), avoiding brittle header-forwarding middleware in Server Components.
- **Strict Separation:** **Never** import `src/services/auth/auth.ts` or `src/dal/auth.dal.ts` into Client Components.
- **Route Handler:** Exposed at `src/app/api/auth/[...all]/route.ts`.

---

## 2. Authorization & Route Guards

### Server-Side Route Guarding
- Protected routes (e.g. `/dashboard/*`) check sessions server-side within layouts or page Server Components.
- Unauthenticated requests are redirected server-side using Next.js `redirect()` to prevent flashes of unauthenticated content.

### Action-Level Auth Verification
- Input validation and authentication checks must occur inside the server action or route handler **before** the service layer is invoked.
- Session retrieval in server actions:
  ```ts
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return err("Unauthorized");
  }
  ```

---

## 3. Role-Based Administration & Access Control

- **Better-Auth Admin Plugin:** Enabled via `admin()` plugin in `src/services/auth/auth.ts` and `adminClient()` in `src/services/auth/auth-client.ts`.
- **Database Schema:** `user` table includes `role` (`'user'` | `'admin'`), `banned`, `ban_reason`, and `ban_expires`. The `session` table includes `impersonated_by`.
- **Verification Helper:** `isAdmin(user)` located in `src/services/auth/admin.ts` checks `user.role === "admin"`.
- **Scope:** Protects the administration console (`/dashboard/admin`) at the layout level (`layout.tsx`), user management, manual credit grants, account bans, job source telemetry, financial credit ledgers, and feature flag management.

---

## 4. Content Sanitization & XSS Prevention

External job descriptions scraped from third-party websites or ATS boards may contain malicious HTML, CSS, or tracking scripts.

- **DOMParser Sanitization:** Any client-side component rendering external HTML via `dangerouslySetInnerHTML` must sanitize input using a browser-based `DOMParser` with a strict allowlist.
- **Safe-Tag Allowlist:** Permits formatting tags only (`<p>`, `<b>`, `<strong>`, `<i>`, `<em>`, `<ul>`, `<ol>`, `<li>`, `<br>`).
- **Safe-Attribute Allowlist:** Strips inline JavaScript event handlers (`onclick`, `onerror`), iframes, objects, forms, and style blocks.

---

## 5. Secrets Management & Environment Isolation

- **Never Commit Secrets:** API keys (Anthropic, Gemini, OpenAI, Vercel AI Gateway), database connection strings, and `BETTER_AUTH_SECRET` must never be committed to git, logged to terminals, or output in AI chat.
- **Documentation:** When adding a new environment variable, immediately update `.env.example` with a placeholder key and description.
- **Browser Isolation:** Never prefix server-only secrets with `NEXT_PUBLIC_`. Server secrets must only be accessed within server-only modules, server actions, or route handlers.
