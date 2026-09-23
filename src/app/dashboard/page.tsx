import { Suspense } from "react";
import { ClientShell } from "@/components/ClientShell";
import { JobList } from "@/components/JobList";
import { searchParamsCache } from "@/lib/search-params";
import { JobStatus } from "@/services/db/schema";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { JobListSkeleton } from "@/components/job/JobListSkeleton";
import { ScrollToTopButton } from "@/components/job/ScrollToTopButton";
import { getDashboardFeedData } from "@/services/dashboard.service";

import { requireSession } from "@/lib/auth-guard";

export const maxDuration = 60;

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

export default function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  return (
    <NuqsAdapter>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 z-10">
        <ClientShell>
          <Suspense fallback={<JobListSkeleton />}>
            <DashboardFeed searchParams={searchParams} />
          </Suspense>
        </ClientShell>
        <ScrollToTopButton />
      </main>
    </NuqsAdapter>
  );
}

