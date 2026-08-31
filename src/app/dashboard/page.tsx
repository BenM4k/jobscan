import { Suspense } from "react";
import { ClientShell } from "@/components/ClientShell";
import { JobList } from "@/components/JobList";
import { searchParamsCache } from "@/lib/search-params";
import { JobStatus } from "@/services/db/schema";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { JobCardSkeleton } from "@/components/JobCardSkeleton";
import { getDashboardFeedData } from "@/services/dashboard.service";

import { requireSession } from "@/lib/auth-guard";

export const instant = false;

interface DashboardPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function DashboardFeed({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sessionResult = await requireSession();
  const userId = sessionResult.ok ? sessionResult.value?.user?.id : undefined;

  const { status, source, startDate, endDate, q } =
    await searchParamsCache.parse(searchParams);
  const statusFilter = status === "all" ? undefined : (status as JobStatus);
  const sourceFilter = source === "all" ? undefined : source;
  const queryFilter = q || undefined;

  const { jobs, totalJobs } = await getDashboardFeedData({
    statusFilter,
    sourceFilter,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    queryFilter,
    limit: 20,
    offset: 0,
    userId,
  });

  return (
    <JobList
      initialJobs={jobs}
      totalJobs={totalJobs}
      statusFilter={statusFilter}
      sourceFilter={sourceFilter}
      startDate={startDate || undefined}
      endDate={endDate || undefined}
      queryFilter={queryFilter}
    />
  );
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  return (
    <NuqsAdapter>
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-8 z-10">
        <ClientShell>
          <Suspense
            fallback={
              <div className="divide-y divide-slate-200/70 dark:divide-zinc-800/80">
                <JobCardSkeleton />
                <JobCardSkeleton />
                <JobCardSkeleton />
              </div>
            }
          >
            <DashboardFeed searchParams={searchParams} />
          </Suspense>
        </ClientShell>
      </main>
    </NuqsAdapter>
  );
}

