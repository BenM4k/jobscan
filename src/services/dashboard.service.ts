import * as jobsDal from "@/dal/jobs.dal";
import { JobSelect } from "@/dal/jobs.dal";
import { JobStatus } from "@/services/db/schema";
import { inngest } from "@/inngest/client";

export interface DashboardFilters {
  statusFilter?: JobStatus;
  sourceFilter?: string;
  startDate?: string;
  endDate?: string;
  queryFilter?: string;
  limit?: number;
  offset?: number;
  userId?: string;
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
    userId,
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
      userId,
    ),
    jobsDal.countJobs(
      statusFilter,
      sourceFilter,
      startDate,
      endDate,
      queryFilter,
      userId,
    ),
  ]);

  const jobs = dalListResult.ok ? dalListResult.value : [];
  const totalJobs = countResult.ok ? countResult.value : jobs.length;

  // If pipeline is completely empty on initial dashboard load (no filters applied),
  // dispatch background job fetch via Inngest without blocking the request path.
  if (
    jobs.length === 0 &&
    !statusFilter &&
    !sourceFilter &&
    !startDate &&
    !endDate &&
    !queryFilter
  ) {
    inngest
      .send({
        name: "job.fetch.requested",
        data: { source: "all", userId },
      })
      .catch((err) => {
        console.warn("[Dashboard] Non-blocking Inngest job fetch trigger failed:", err);
      });
  }

  return {
    jobs,
    totalJobs,
  };
}

