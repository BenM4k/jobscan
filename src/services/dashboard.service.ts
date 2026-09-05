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

// Cooldown window (10 minutes) to prevent concurrent repeated empty-feed triggers
export const EMPTY_FEED_FETCH_COOLDOWN_MS = 10 * 60 * 1000;
const emptyFeedDispatchTracker = new Map<string, number>();

export function shouldDispatchEmptyFeedFetch(
  userOrGlobalKey: string,
  now: number = Date.now()
): boolean {
  const lastTrigger = emptyFeedDispatchTracker.get(userOrGlobalKey);
  if (lastTrigger && now - lastTrigger < EMPTY_FEED_FETCH_COOLDOWN_MS) {
    return false;
  }
  emptyFeedDispatchTracker.set(userOrGlobalKey, now);
  return true;
}

export function resetEmptyFeedDispatchTracker(): void {
  emptyFeedDispatchTracker.clear();
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
  // Uses in-memory cooldown and durable Inngest event ID to prevent concurrent duplicate workflows.
  const dedupeKey = userId || "global-empty-feed";
  if (
    jobs.length === 0 &&
    !statusFilter &&
    !sourceFilter &&
    !startDate &&
    !endDate &&
    !queryFilter &&
    shouldDispatchEmptyFeedFetch(dedupeKey)
  ) {
    const bucket = Math.floor(Date.now() / EMPTY_FEED_FETCH_COOLDOWN_MS);
    inngest
      .send({
        name: "job.fetch.requested",
        id: `empty-feed-${dedupeKey}-${bucket}`,
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

