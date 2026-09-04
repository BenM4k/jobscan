"use server";

import { requireSession } from "@/lib/auth-guard";
import * as jobService from "@/services/job.service";
import { JobStatus } from "@/services/db/schema";
import { z } from "zod";

const triggerFetchSchema = z.object({
  sourceId: z.enum(["greenhouse", "remoteok", "lever", "ashby"]),
  target: z.string().optional(),
});

const transitionStatusSchema = z.object({
  jobId: z.string().uuid(),
  status: z.enum([
    "new",
    "saved",
    "scored",
    "tailored",
    "applied",
    "interviewing",
    "rejected",
    "offer",
  ]),
});

const scoreJobSchema = z.object({
  jobId: z.string().uuid(),
  provider: z.enum(["claude", "gemini", "openai", "gateway"]).optional(),
});

export async function triggerJobFetchAction(formData: FormData) {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value)
    return { success: false, error: sessionResult.ok ? "Unauthorized" : sessionResult.error.message };

  const parsed = triggerFetchSchema.safeParse({
    sourceId: formData.get("sourceId"),
    target: formData.get("target")?.toString() || undefined,
  });
  if (!parsed.success) {
    return { success: false, error: "Invalid source or target selected" };
  }

  const result = await jobService.fetchAndUpsertJobs(
    parsed.data.sourceId,
    parsed.data.target,
    sessionResult.value.user.id,
  );
  if (!result.ok) {
    return { success: false, error: result.error.message };
  }

  return { success: true, data: result.value };
}

export async function transitionJobStatusAction(
  jobId: string,
  status: JobStatus,
) {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value)
    return { success: false, error: sessionResult.ok ? "Unauthorized" : sessionResult.error.message };

  const parsed = transitionStatusSchema.safeParse({ jobId, status });
  if (!parsed.success) {
    return { success: false, error: "Invalid status transition arguments" };
  }

  const result = await jobService.transitionJobStatus(
    parsed.data.jobId,
    parsed.data.status,
    sessionResult.value.user.id,
  );
  if (!result.ok) {
    return { success: false, error: result.error.message };
  }

  return { success: true, data: result.value };
}

export async function scoreJobAction(
  jobId: string,
  provider?: "claude" | "gemini" | "openai" | "gateway",
) {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value)
    return { success: false, error: sessionResult.ok ? "Unauthorized" : sessionResult.error.message };

  const parsed = scoreJobSchema.safeParse({ jobId, provider });
  if (!parsed.success) {
    return { success: false, error: "Invalid job scoring arguments" };
  }

  const result = await jobService.scoreJobWithAI(
    parsed.data.jobId,
    sessionResult.value.user.id,
    parsed.data.provider,
  );
  if (!result.ok) {
    return { success: false, error: result.error.message };
  }

  return { success: true, data: result.value };
}

export async function fetchMoreJobsAction(
  statusFilter?: JobStatus,
  sourceFilter?: string,
  offset: number = 0,
  limit: number = 20,
  startDate?: string,
  endDate?: string,
  queryFilter?: string,
) {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value)
    return { success: false, error: sessionResult.ok ? "Unauthorized" : sessionResult.error.message };

  const dalListResult = await (
    await import("@/dal/jobs.dal")
  ).listJobs(
    statusFilter,
    sourceFilter,
    limit,
    offset,
    startDate,
    endDate,
    queryFilter,
    sessionResult.value.user.id,
  );
  if (!dalListResult.ok) {
    return { success: false, error: dalListResult.error.message };
  }

  return { success: true, data: dalListResult.value };
}

const addManualJobSchema = z.object({
  title: z.string().min(1, "Job title is required"),
  company: z.string().min(1, "Company name is required"),
  url: z.string().url("Please provide a valid job posting URL"),
  description: z
    .string()
    .min(10, "Job description must be at least 10 characters"),
});

export async function addManualJobAction(formData: FormData) {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value)
    return { success: false, error: sessionResult.ok ? "Unauthorized" : sessionResult.error.message };

  const parsed = addManualJobSchema.safeParse({
    title: formData.get("title")?.toString() || "",
    company: formData.get("company")?.toString() || "",
    url: formData.get("url")?.toString() || "",
    description: formData.get("description")?.toString() || "",
  });

  if (!parsed.success) {
    const errorMsg =
      parsed.error.issues[0]?.message || "Invalid job input data";
    return { success: false, error: errorMsg };
  }

  const jobsDal = await import("@/dal/jobs.dal");
  const externalId = `manual-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const result = await jobsDal.upsertJob({
    userId: sessionResult.value.user.id,
    source: "manual",
    externalId,
    title: parsed.data.title,
    company: parsed.data.company,
    url: parsed.data.url,
    description: parsed.data.description,
    postedAt: new Date(),
    status: "new",
  });

  if (!result.ok) {
    return { success: false, error: result.error.message };
  }

  return { success: true, data: result.value };
}

export async function deleteJobAction(jobId: string) {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value)
    return { success: false, error: sessionResult.ok ? "Unauthorized" : sessionResult.error.message };

  const jobsDal = await import("@/dal/jobs.dal");
  const result = await jobsDal.deleteJob(jobId, sessionResult.value.user.id);
  if (!result.ok) {
    return { success: false, error: result.error.message };
  }

  return { success: true };
}

import { JobSelect } from "@/dal/jobs.dal";

export async function restoreJobAction(jobData: JobSelect) {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value)
    return { success: false, error: sessionResult.ok ? "Unauthorized" : sessionResult.error.message };

  const jobsDal = await import("@/dal/jobs.dal");
  const restoreStatus =
    jobData.status && jobData.status !== "withdrawn" ? jobData.status : "saved";
  const result = await jobsDal.restoreJob({
    ...jobData,
    userId: sessionResult.value.user.id,
    status: restoreStatus,
  });
  if (!result.ok) {
    return { success: false, error: result.error.message };
  }

  return { success: true, data: result.value };
}

export async function triggerDrcCrawlAction(keyword?: string) {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value)
    return { success: false, error: sessionResult.ok ? "Unauthorized" : sessionResult.error.message };

  try {
    const { runDrcCrawler } = await import("@/services/crawler/run");
    const crawlResult = await runDrcCrawler(keyword, sessionResult.value.user.id);
    if (!crawlResult.success) {
      return { success: false, error: crawlResult.error || "DRC crawl search failed" };
    }
    return { success: true, data: crawlResult };
  } catch (E) {
    console.error(E);
    const message = E instanceof Error ? E.message : "DRC crawl search failed";
    return { success: false, error: message };
  }
}
