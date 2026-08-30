import * as jobsDal from "@/dal/jobs.dal";
import { JobSelect } from "@/dal/jobs.dal";
import { JobStatus } from "@/services/db/schema";
import { runDrcCrawler } from "@/services/crawler/run";

export interface DashboardFilters {
  statusFilter?: JobStatus;
  sourceFilter?: string;
  startDate?: string;
  endDate?: string;
  queryFilter?: string;
  limit?: number;
  offset?: number;
}

export interface DashboardFeedResult {
  jobs: JobSelect[];
  totalJobs: number;
}

export async function getDashboardFeedData(
  filters: DashboardFilters = {},
): Promise<DashboardFeedResult> {
  const {
    statusFilter,
    sourceFilter,
    startDate,
    endDate,
    queryFilter,
    limit = 20,
    offset = 0,
  } = filters;

  const [dalListResult, countResult] = await Promise.all([
    jobsDal.listJobs(
      statusFilter,
      sourceFilter,
      limit,
      offset,
      startDate,
      endDate,
      queryFilter,
    ),
    jobsDal.countJobs(
      statusFilter,
      sourceFilter,
      startDate,
      endDate,
      queryFilter,
    ),
  ]);

  let jobs = dalListResult.ok ? dalListResult.value : [];
  let totalJobs = countResult.ok ? countResult.value : jobs.length;

  // If pipeline is completely empty on initial dashboard load (no filters or query applied),
  // automatically trigger initial DRC job crawl to populate opportunities
  if (
    jobs.length === 0 &&
    !statusFilter &&
    !sourceFilter &&
    !startDate &&
    !endDate &&
    !queryFilter
  ) {
    try {
      await runDrcCrawler();
      const [reFetched, reCount] = await Promise.all([
        jobsDal.listJobs(
          statusFilter,
          sourceFilter,
          limit,
          offset,
          startDate,
          endDate,
          queryFilter,
        ),
        jobsDal.countJobs(
          statusFilter,
          sourceFilter,
          startDate,
          endDate,
          queryFilter,
        ),
      ]);
      if (reFetched.ok) {
        jobs = reFetched.value;
      }
      if (reCount.ok) {
        totalJobs = reCount.value;
      }
    } catch (err) {
      console.error("Failed initial auto-crawl on dashboard feed load:", err);
    }
  }

  return {
    jobs,
    totalJobs,
  };
}
