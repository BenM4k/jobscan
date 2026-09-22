# Auth & Security Guide

This document describes authentication, authorization, content sanitization, and secret management in Jobpilot.

---

## 1. Authentication Architecture (better-auth)

Jobpilot uses **better-auth** for session handling, authentication plugins, and user identity.

- **Server Instance (`src/services/auth/auth.ts`):** Handles credential verification, session creation, and database adapters. Marked with `import "server-only"`.
- **Client Instance (`src/services/auth/auth-client.ts`):** Exports client hooks (`useSession`, `signIn`, `signOut`) for use in Client Components.
- **Strict Separation:** **Never** import `src/services/auth/auth.ts` into Client Components.
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

## 3. Admin Access Stopgap

- **Verification Helper:** `isAdmin(user)` located in `src/services/auth/admin.ts`.
- **Mechanism:** Checks if the authenticated `user.id` exists in the comma-separated `ADMIN_USER_IDS` environment variable.
- **Scope:** Protects sensitive administrative features such as feature flag toggles and per-user override assignments at `/dashboard/admin`.
- *Note:* This is an explicit temporary stopgap pending a full database-backed role-based access control (RBAC) system.

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
