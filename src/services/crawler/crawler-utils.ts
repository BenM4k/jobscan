import { CrawledJob } from "./types";
import { isDrcJob } from "./drc-filter";
import * as jobsDal from "@/dal/jobs.dal";
import { isOlderThanOneMonth } from "@/lib/date-utils";
import * as resumeDal from "@/dal/resume.dal";
import {
  buildJobSimhashText,
  computeSimhash,
  DEFAULT_SIMHASH_THRESHOLD,
} from "@/lib/simhash";

export function matchesKeyword(candidate: CrawledJob, keyword?: string): boolean {
  if (!keyword || !keyword.trim()) return true;
  const kw = keyword.trim().toLowerCase();
  return (
    candidate.title.toLowerCase().includes(kw) ||
    candidate.company.toLowerCase().includes(kw) ||
    Boolean(candidate.description?.toLowerCase().includes(kw))
  );
}

export function isEligibleCandidate(candidate: CrawledJob, keyword?: string): boolean {
  return isDrcJob(candidate) && matchesKeyword(candidate, keyword);
}

export function parseLocationFromText(locName?: string): {
  city?: string;
  country?: string;
  isRemote: boolean;
} {
  if (!locName || !locName.trim()) {
    return { isRemote: false };
  }

  const trimmed = locName.trim();
  const isRemote = /remote/i.test(trimmed);

  if (isRemote) {
    return { isRemote: true };
  }

  const parts = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length > 1) {
    return {
      city: parts[0],
      country: parts[parts.length - 1],
      isRemote: false,
    };
  }

  return {
    city: trimmed,
    isRemote: false,
  };
}

export async function resolveCrawlerKeyword(
  keyword?: string,
  userId?: string
): Promise<string | undefined> {
  let targetKeyword = keyword?.trim() || undefined;
  if (!targetKeyword && userId) {
    try {
      const resumeRes = await resumeDal.getActiveMasterResume(userId);
      if (resumeRes.ok && resumeRes.value) {
        const skillsRes = await resumeDal.getResumeSkills(resumeRes.value.id);
        const topSkill =
          skillsRes.ok && skillsRes.value.length > 0
            ? skillsRes.value[0]
            : undefined;
        if (topSkill) {
          targetKeyword = topSkill;
        }
      }
    } catch {
      // Graceful fallback to broad crawl
    }
  }
  return targetKeyword;
}

export async function ingestCrawledJob(
  job: CrawledJob,
  userId?: string,
  sourceName?: string
): Promise<boolean> {
  try {
    if (job.postedAt && isOlderThanOneMonth(job.postedAt)) {
      return false;
    }

    if (userId) {
      const deleted = await jobsDal.isJobDeleted(
        job.source,
        job.externalId,
        userId
      );
      if (deleted) {
        return false;
      }
    }

    // DB Call 1: Ingest raw payload first
    const rawPayloadRes = await jobsDal.insertRawJobPayload(
      job.source as jobsDal.JobSource,
      job.externalId,
      job as unknown as Record<string, unknown>
    );

    if (!rawPayloadRes.ok) {
      console.error(
        `[Crawler ${sourceName || job.source}] Failed to insert raw job payload for ${job.externalId}:`,
        rawPayloadRes.error
      );
      return false;
    }

    // DB Call 2: Read payload from raw_job_payload, normalize, and upsert canonical job
    const stored = rawPayloadRes.value;
    const rawPayload = stored.payload as Record<string, unknown>;

    const normTitle = (rawPayload.title as string) || job.title;
    const normCompany = (rawPayload.company as string) || job.company;
    const normDesc = (rawPayload.description as string) || job.description;

    // Compute 64-bit SimHash for cross-source deduplication
    const simhashText = buildJobSimhashText(normTitle, normCompany, normDesc);
    const simhashRes = computeSimhash(simhashText);

    // Atomically check near-duplicates and upsert canonical job in one serialized DB operation
    const dedupRes = await jobsDal.upsertCanonicalJobWithSimhashDedup(
      {
        userId: userId || undefined,
        source: (rawPayload.source as jobsDal.JobSource) || (job.source as jobsDal.JobSource),
        externalId: (rawPayload.externalId as string) || job.externalId,
        title: normTitle,
        company: normCompany,
        url: (rawPayload.url as string) || job.url,
        description: normDesc,
        postedAt: rawPayload.postedAt ? new Date(rawPayload.postedAt as string | Date) : job.postedAt,
        country: (rawPayload.country as string) || job.country,
        countryCode: (rawPayload.countryCode as string) || job.countryCode,
        city: (rawPayload.city as string) || job.city,
        workplaceType: (rawPayload.workplaceType as "remote" | "on-site" | "hybrid" | null | undefined) || job.workplaceType,
        remoteRegions: (rawPayload.remoteRegions as string[]) || job.remoteRegions,
        status: "active",
        simhash: simhashRes.hashString,
      },
      simhashRes.signedBigInt,
      DEFAULT_SIMHASH_THRESHOLD
    );

    if (!dedupRes.ok) {
      console.error(
        `[Crawler ${sourceName || job.source}] Failed in serialized simhash dedup upsert for ${job.externalId}:`,
        dedupRes.error
      );
      return false;
    }

    const { canonicalJob } = dedupRes.value;

    // Link cross-source ref and back-reference on raw payload
    const linkRes = await jobsDal.linkJobSourceRef(
      canonicalJob.id,
      job.source as jobsDal.JobSource,
      job.externalId,
      job.url
    );
    if (!linkRes.ok) {
      console.error(
        `[Crawler ${sourceName || job.source}] Failed to link job source ref for ${job.externalId}:`,
        linkRes.error
      );
      return false;
    }

    const updatePayloadRes = await jobsDal.updateRawJobPayloadNormalizedJob(stored.id, canonicalJob.id);
    if (!updatePayloadRes.ok) {
      console.error(
        `[Crawler ${sourceName || job.source}] Failed to update raw payload normalized job ref for ${job.externalId}:`,
        updatePayloadRes.error
      );
      return false;
    }

    if (userId) {
      await jobsDal.upsertUserPipelineEntry(userId, canonicalJob.id, "saved");
    }

    return true;
  } catch (err) {
    console.error(
      `[Crawler ${sourceName || job.source}] Exception upserting job ${job.externalId}:`,
      err
    );
    return false;
  }
}
