/**
 * Centralized cache-tag constants used with `cacheTag()` inside `"use cache"`
 * boundaries and `revalidateTags()` / `revalidateTag()` inside server actions.
 *
 * Naming convention: `<domain>:<scope>` — keep tags stable and coarse enough
 * that a single mutation can invalidate the right pages without needing to
 * enumerate every affected path.
 */

import { revalidateTag as nextRevalidateTag } from "next/cache";

// ── Dashboard feed (job list) ────────────────────────────────────────────────
export const DASHBOARD_FEED_TAG = "dashboard:feed";

// ── Profile / master-resume editor ───────────────────────────────────────────
export const PROFILE_TAG = "profile:data";

// ── Resume persona management ────────────────────────────────────────────────
export const RESUMES_TAG = "resumes:list";

// ── Billing (credits, subscriptions, ledger) ─────────────────────────────────
export const BILLING_TAG = "billing:data";

// ── User settings (flags, preferences, sessions) ────────────────────────────
export const SETTINGS_TAG = "settings:data";

// ── Admin overview metrics ───────────────────────────────────────────────────
export const ADMIN_OVERVIEW_TAG = "admin:overview";

// ── Admin user management table ──────────────────────────────────────────────
export const ADMIN_USERS_TAG = "admin:users";

// ── Global & Dashboard Navigation bar ────────────────────────────────────────
export const NAVBAR_TAG = "navbar:data";

// ── Convenience group: all resume-related tags to invalidate together ────────
export const RESUME_MUTATION_TAGS = [
  RESUMES_TAG,
  DASHBOARD_FEED_TAG,
  PROFILE_TAG,
] as const;

// ── Convenience group: admin mutation tags ───────────────────────────────────
export const ADMIN_MUTATION_TAGS = [
  ADMIN_OVERVIEW_TAG,
  ADMIN_USERS_TAG,
] as const;

// ── Granular Entity Tag Generators ───────────────────────────────────────────

/**
 * Generates a granular cache tag for a single job opportunity by ID.
 * Format: `job:<jobId>`
 */
export function jobTag(jobId: string): string {
  return `job:${jobId}`;
}

/**
 * Generates a granular cache tag for a single resume persona by ID.
 * Format: `resume:${resumeId}`
 */
export function resumeTag(resumeId: string): string {
  return `resume:${resumeId}`;
}

// ── Revalidation Helpers ─────────────────────────────────────────────────────

/**
 * Revalidates a single cache tag with Next.js 16.3+ "max" profile by default.
 */
export function revalidateTag(tag: string, profile: string = "max"): void {
  try {
    nextRevalidateTag(tag, profile);
  } catch {
    // Safely ignore when called outside a Next.js request context (e.g. background workers, tests)
  }
}

/**
 * Revalidates one or multiple cache tags in one call.
 * Accepts a single tag string or an array of tags.
 */
export function revalidateTags(
  tags: string | readonly string[],
  profile: string = "max"
): void {
  try {
    if (typeof tags === "string") {
      nextRevalidateTag(tags, profile);
    } else {
      tags.forEach((tag) => nextRevalidateTag(tag, profile));
    }
  } catch {
    // Safely ignore when called outside a Next.js request context
  }
}

/** Alias for revalidateTag */
export const bustTag = revalidateTag;

/** Alias for revalidateTags */
export const bustTags = revalidateTags;
