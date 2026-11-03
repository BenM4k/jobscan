"use cache";

import { cacheTag } from "next/cache";
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
  cacheTag(DASHBOARD_FEED_TAG);

  const { getDashboardFeedData } = await import(
    "@/services/dashboard.service"
  );
  return getDashboardFeedData(opts);
}

// ── Single Job Detail ────────────────────────────────────────────────────────

export async function getCachedJobById(jobId: string, userId: string) {
  cacheTag(jobTag(jobId));

  const jobsDal = await import("@/dal/jobs.dal");
  return jobsDal.getJobById(jobId, userId);
}

// ── Profile / Active Master Resume ───────────────────────────────────────────

export async function getCachedActiveResume(userId: string) {
  cacheTag(PROFILE_TAG);

  const resumeDal = await import("@/dal/resume.dal");
  return resumeDal.getActiveMasterResume(userId);
}

export async function getCachedResumeSkills(resumeId: string) {
  cacheTag(PROFILE_TAG);

  const resumeDal = await import("@/dal/resume.dal");
  return resumeDal.getResumeSkills(resumeId);
}

// ── Resume Personas List ─────────────────────────────────────────────────────

export async function getCachedMasterResumes(userId: string) {
  cacheTag(RESUMES_TAG);

  const resumeDal = await import("@/dal/resume.dal");
  return resumeDal.getMasterResumes(userId);
}

export async function getCachedMasterResumeById(resumeId: string, userId: string) {
  cacheTag(resumeTag(resumeId));

  const resumeDal = await import("@/dal/resume.dal");
  return resumeDal.getMasterResumeById(resumeId, userId);
}

// ── Billing ──────────────────────────────────────────────────────────────────

export async function getCachedBillingData(userId: string) {
  cacheTag(BILLING_TAG);

  const billingDal = await import("@/dal/billing.dal");
  const [balanceRes, subRes, initialPacksRes, initialPlansRes, ledgerRes] =
    await Promise.all([
      billingDal.getCreditBalance(userId),
      billingDal.getUserSubscription(userId),
      billingDal.getCreditPacks(true),
      billingDal.getSubscriptionPlans(true),
      billingDal.getCreditLedger(userId, 50),
    ]);

  let packs = initialPacksRes.ok ? initialPacksRes.value : [];
  let plans = initialPlansRes.ok ? initialPlansRes.value : [];

  if (packs.length === 0 || plans.length === 0) {
    const { seedBillingDefaultsIfEmpty } = await import("@/dal/billing-seed.dal");
    await seedBillingDefaultsIfEmpty();
    const [refetchedPacks, refetchedPlans] = await Promise.all([
      billingDal.getCreditPacks(true),
      billingDal.getSubscriptionPlans(true),
    ]);
    if (refetchedPacks.ok && refetchedPacks.value.length > 0) {
      packs = refetchedPacks.value;
    }
    if (refetchedPlans.ok && refetchedPlans.value.length > 0) {
      plans = refetchedPlans.value;
    }
  }

  return {
    balance: balanceRes.ok ? balanceRes.value : 0,
    subscription: subRes.ok ? subRes.value : null,
    packs,
    plans,
    ledger: ledgerRes.ok ? ledgerRes.value : [],
  };
}

// ── Settings ─────────────────────────────────────────────────────────────────

export async function getCachedUserFlags(userId: string) {
  cacheTag(SETTINGS_TAG);

  const { getUserFeatureFlags } = await import("@/services/flags");
  return getUserFeatureFlags(userId);
}

export async function getCachedUserPreferences(userId: string) {
  cacheTag(SETTINGS_TAG);

  const growthDal = await import("@/dal/growth.dal");
  return growthDal.getUserPreferences(userId);
}

export async function getCachedAiUsage(userId: string) {
  cacheTag(SETTINGS_TAG);

  const { getUserAiUsage } = await import("@/services/ai/usage.service");
  return getUserAiUsage(userId);
}

// ── Admin Overview ───────────────────────────────────────────────────────────

export async function getCachedAdminOverview() {
  cacheTag(ADMIN_OVERVIEW_TAG);

  const { getAdminOverview } = await import(
    "@/services/admin/admin.service"
  );
  return getAdminOverview();
}

// ── Admin Users ──────────────────────────────────────────────────────────────

export async function getCachedAdminUsers(opts: {
  page: number;
  limit: number;
  search?: string;
  role?: string;
}) {
  cacheTag(ADMIN_USERS_TAG);

  const { getAdminUsers } = await import("@/services/admin/admin.service");
  return getAdminUsers(opts);
}
