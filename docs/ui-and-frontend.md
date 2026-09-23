# UI & Frontend Architecture Guide

This document describes Jobpilot's frontend architecture, component standards, shadcn/ui rules, localization, and async job lifecycle patterns.

---

## 1. Component Standards & shadcn/ui Mandate

Jobpilot enforces strict design consistency using Tailwind CSS and shadcn/ui.

### The shadcn Primitives Rule
- **Mandatory shadcn/ui Primitives:** Always use official shadcn components in `src/components/ui/` (`DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `Dialog`, `Popover`, `Button`, etc.).
- **No Handwritten Overlays:** Never build ad-hoc custom dropdowns, popovers, or modal sheets using raw `useState` and manual floating coordinate math.
- **Navigation Controls:** The primary desktop user dropdown in the main layout is `NavbarUserDropdown` (`src/components/layout/NavbarUserDropdown.tsx`), which composes official shadcn `DropdownMenu` primitives. Handwritten dropdown replacements are strictly forbidden.

---

## 2. Server vs. Client Component Boundaries

- **Default to Server Components:** All pages and layout components must be Server Components by default.
- **Push `"use client"` to Leaves:** Wrap only the smallest interactive element (e.g. a button with a click handler, a form, or a dropdown) with `"use client"`. Never convert an entire page or large container into a Client Component.
- **Data Fetching:** Never fetch data in a Client Component if it can be fetched in a Server Component and passed down as props.
- **Loading & Error Boundaries:** Use standard Next.js App Router conventions (`loading.tsx`, `error.tsx`, and `<Suspense>`) rather than manual loading spinners managed in state.

---

## 3. Localization & Internationalization (next-intl)

Jobpilot supports bilingual operation in English and French.

- **Catalogs:** Message keys are defined in `messages/en.json` and `messages/fr.json`.
- **Comprehensive Coverage:** All user-facing text must be localized:
  - Static resume metadata (Default, Active Master Resume, Master:, Promoted).
  - Retry-workflow badges (attempt counts, countdowns, retry/cancel buttons).
  - Background ingestion cards and circuit breaker notification banners.
  - Persona selector dropdowns and match score labels.
- **Usage:** In Client Components, use `useTranslations("namespace")`; in Server Components, use `getTranslations("namespace")`.

---

## 4. Async Job Retry Lifecycle & Stream Aborts

Long-running AI streaming and polling actions use the `useAsyncJobWithRetry` hook for consistent retry UX:

- **Ref-Backed Job Function:** `useAsyncJobWithRetry` stores the latest job execution function in a React `useRef`. When retries are exhausted (`status === "error"`) and no automatic countdown is active, calling `retryNow()` re-executes `execute(lastJobFn)` to restart from the UI.
- **Unmount Abort Cleanup:** Hooks managing streaming operations (`useCoverLetter`, `useJobScoring`) must implement unmount abort cleanup via an effect calling `abortControllerRef.current?.abort()`.
- **Cancel Retry:** Cancelling a pending retry must cleanly abort active network streams and reset local UI timers.

---

## 5. Tailored Resume In-Place Editing

- **Inline Editing:** Users can edit AI-tailored resume bullet points and sections directly in the UI.
- **Persistence:** Modifications persist via `PUT /api/jobs/[id]/tailor-resume` calling `jobService.updateTailoredResume` before exiting edit mode, adhering to the standard route handler → service → DAL layering.
- **Single-Save Ingestion:** `jobsDal.updateJobTailoredResume` accepts an optional `language` parameter and writes it atomically to `tailored_resume` in a single query, eliminating redundant lookups.
