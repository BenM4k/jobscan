import { CrawledJob } from "./types";
import { isDrcJob } from "./drc-filter";
import * as jobsDal from "@/dal/jobs.dal";
import { isOlderThanOneMonth } from "@/lib/date-utils";
import * as resumeDal from "@/dal/resume.dal";

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

    const [rawPayloadRes, res] = await Promise.all([
      jobsDal.insertRawJobPayload(
        job.source as jobsDal.JobSource,
        job.externalId,
        job as unknown as Record<string, unknown>
      ),
      jobsDal.upsertJob({
        userId: userId || undefined,
        source: job.source as jobsDal.JobSource,
        externalId: job.externalId,
        title: job.title,
        company: job.company,
        url: job.url,
        description: job.description,
        postedAt: job.postedAt,
        country: job.country,
        countryCode: job.countryCode,
        city: job.city,
        workplaceType: job.workplaceType,
        remoteRegions: job.remoteRegions,
        status: "active",
      }),
    ]);

    if (!rawPayloadRes.ok) {
      console.error(
        `[Crawler ${sourceName || job.source}] Failed to insert raw job payload for ${job.externalId}:`,
        rawPayloadRes.error
      );
    }

    if (!res.ok) {
      console.error(
        `[Crawler ${sourceName || job.source}] Failed to upsert job ${job.externalId}:`,
        res.error
      );
      return false;
    }

    const linkRes = await jobsDal.linkJobSourceRef(
      res.value.id,
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

    return true;
  } catch (err) {
    console.error(
      `[Crawler ${sourceName || job.source}] Exception upserting job ${job.externalId}:`,
      err
    );
    return false;
  }
}
