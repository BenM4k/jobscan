"use cache";

import { cacheTag, cacheLife } from "next/cache";
import {
  DASHBOARD_FEED_TAG,
  PROFILE_TAG,
  RESUMES_TAG,
  BILLING_TAG,
  SETTINGS_TAG,
  ADMIN_OVERVIEW_TAG,
  ADMIN_USERS_TAG,
  jobTag,
  resumeTag,
} from "@/lib/cache-tags";
import type { JobStatus } from "@/services/db/schema";

// ── Dashboard Feed ───────────────────────────────────────────────────────────

export async function getCachedDashboardFeed(opts: {
  statusFilter?: JobStatus;
  sourceFilter?: string;
  startDate?: string;
  endDate?: string;
  queryFilter?: string;
  limit: number;
  offset: number;
  userId?: string;
}) {
  cacheLife("minutes");
  cacheTag(DASHBOARD_FEED_TAG);

  const { getDashboardFeedData } = await import("@/services/dashboard.service");
  return getDashboardFeedData(opts);
}

// ── Single Job Detail ────────────────────────────────────────────────────────

export async function getCachedJobById(jobId: string, userId: string) {
  cacheLife("minutes");
  cacheTag(jobTag(jobId));

  const jobsDal = await import("@/dal/jobs.dal");
  return jobsDal.getJobById(jobId, userId);
}

// ── Profile / Active Master Resume ───────────────────────────────────────────

export async function getCachedActiveResume(userId: string) {
  cacheLife("minutes");
  cacheTag(PROFILE_TAG);

  const resumeDal = await import("@/dal/resume.dal");
  return resumeDal.getActiveMasterResume(userId);
}

export async function getCachedResumeSkills(resumeId: string) {
  cacheLife("minutes");
  cacheTag(PROFILE_TAG);

  const resumeDal = await import("@/dal/resume.dal");
  return resumeDal.getResumeSkills(resumeId);
}

// ── Resume Personas List ─────────────────────────────────────────────────────

export async function getCachedMasterResumes(userId: string) {
  cacheLife("minutes");
  cacheTag(RESUMES_TAG);

  const resumeDal = await import("@/dal/resume.dal");
  return resumeDal.getMasterResumes(userId);
}

export async function getCachedMasterResumeById(
  resumeId: string,
  userId: string,
) {
  cacheLife("minutes");
  cacheTag(resumeTag(resumeId));

  const resumeDal = await import("@/dal/resume.dal");
  return resumeDal.getMasterResumeById(resumeId, userId);
}

// ── Billing ──────────────────────────────────────────────────────────────────

export async function getCachedBillingData(userId: string) {
  cacheLife("minutes");
  cacheTag(BILLING_TAG);

  const { readBillingSnapshot } =
    await import("@/services/billing/billing.service");
  return readBillingSnapshot(userId);
}

// ── Settings ─────────────────────────────────────────────────────────────────

export async function getCachedUserFlags(userId: string) {
  cacheLife("minutes");
  cacheTag(SETTINGS_TAG);

  const { getUserFeatureFlags } = await import("@/services/flags");
  return getUserFeatureFlags(userId);
}

export async function getCachedUserPreferences(userId: string) {
  cacheLife("minutes");
  cacheTag(SETTINGS_TAG);

  const growthDal = await import("@/dal/growth.dal");
  return growthDal.getUserPreferences(userId);
}

export async function getCachedAiUsage(userId: string) {
  cacheLife("minutes");
  cacheTag(SETTINGS_TAG);

  const { getUserAiUsage } = await import("@/services/ai/usage.service");
  return getUserAiUsage(userId);
}

// ── Admin Overview ───────────────────────────────────────────────────────────

export async function getCachedAdminOverview() {
  cacheLife("minutes");
  cacheTag(ADMIN_OVERVIEW_TAG);

  const { getAdminOverview } = await import("@/services/admin/admin.service");
  return getAdminOverview();
}

// ── Admin Users ──────────────────────────────────────────────────────────────

export async function getCachedAdminUsers(opts: {
  page: number;
  limit: number;
  search?: string;
  role?: string;
}) {
  cacheLife("minutes");
  cacheTag(ADMIN_USERS_TAG);

  const { getAdminUsers } = await import("@/services/admin/admin.service");
  return getAdminUsers(opts);
}
