import { CrawlResult, CrawlSourceResult } from "./types";
import { fetchReliefWebJobs } from "./sources/reliefweb";
import { fetchRemoteOKJobs } from "./sources/remoteok";
import { fetchGreenhouseJobs } from "./sources/greenhouse";
import { fetchLeverJobs } from "./sources/lever";
import { fetchAshbyJobs } from "./sources/ashby";
import { fetchEmploiCdJobs } from "./sources/emploicd";
import { fetchCongoJobJobs } from "./sources/congojob";
import { fetchUnJobsJobs } from "./sources/unjobs";
import { fetchFecRdcJobs } from "./sources/fecrdc";
import * as jobsDal from "@/dal/jobs.dal";
import { isOlderThanOneMonth } from "@/lib/date-utils";

import * as profileDal from "@/dal/profile.dal";

export async function runDrcCrawler(
  keyword?: string,
  userId?: string,
): Promise<CrawlResult> {
  const startTime = Date.now();

  let targetKeyword = keyword?.trim() || undefined;
  if (!targetKeyword && userId) {
    try {
      const prof = await profileDal.getProfile(userId);
      if (prof.ok && prof.value) {
        const expTitle = prof.value.experience?.[0]?.title?.trim();
        const skill = prof.value.skills?.[0]?.trim();
        if (expTitle) {
          targetKeyword = expTitle;
        } else if (skill) {
          targetKeyword = skill;
        }
      }
    } catch {
      // Graceful fallback to broad crawl
    }
  }

  const sourceFetchers = [
    { name: "reliefweb", fetcher: fetchReliefWebJobs },
    { name: "remoteok", fetcher: fetchRemoteOKJobs },
    { name: "greenhouse", fetcher: fetchGreenhouseJobs },
    { name: "lever", fetcher: fetchLeverJobs },
    { name: "ashby", fetcher: fetchAshbyJobs },
    { name: "emploicd", fetcher: fetchEmploiCdJobs },
    { name: "congojob", fetcher: fetchCongoJobJobs },
    { name: "unjobs", fetcher: fetchUnJobsJobs },
    { name: "fecrdc", fetcher: fetchFecRdcJobs },
  ];

  const sourceResults: CrawlSourceResult[] = [];
  let totalUpserted = 0;
  const filterKw = targetKeyword?.trim()
    ? targetKeyword.trim().toLowerCase()
    : undefined;

  for (const { name, fetcher } of sourceFetchers) {
    try {
      const { result, jobs: rawJobs } = await fetcher(targetKeyword);
      let jobs = rawJobs;

      if (filterKw) {
        jobs = jobs.filter(
          (j) =>
            j.title.toLowerCase().includes(filterKw) ||
            j.description?.toLowerCase().includes(filterKw) ||
            j.company.toLowerCase().includes(filterKw),
        );
      }

      let sourceUpserted = 0;

      for (const job of jobs) {
        try {
          // Skip jobs posted longer than a month ago
          if (job.postedAt && isOlderThanOneMonth(job.postedAt)) {
            continue;
          }

          // Skip job if candidate previously deleted it.
          // Omit when there is no userId — deletion records are user-scoped.
          if (userId) {
            const deleted = await jobsDal.isJobDeleted(
              job.source,
              job.externalId,
              userId,
            );
            if (deleted) {
              continue;
            }
          }

          // Skip upsert when there is no userId — jobs.user_id is NOT NULL.
          if (!userId) {
            continue;
          }

          const res = await jobsDal.upsertJob({
            userId,
            source: job.source,
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
            status: "new",
          });

          if (res.ok) {
            sourceUpserted++;
          }
        } catch (jobErr) {
          console.error(
            `[Crawler ${name}] Failed to upsert job ${job.externalId}:`,
            jobErr,
          );
        }
      }

      result.upserted = sourceUpserted;
      totalUpserted += sourceUpserted;
      sourceResults.push(result);
    } catch (err: unknown) {
      sourceResults.push({
        source: name,
        fetched: 0,
        matched: 0,
        upserted: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const durationMs = Date.now() - startTime;
  return {
    success: true,
    totalUpserted,
    sources: sourceResults,
    durationMs,
  };
}
