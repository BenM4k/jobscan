import { Suspense } from "react";
import * as jobsDal from "@/dal/jobs.dal";
import { requireSession } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import { ClientShell } from "@/components/ClientShell";
import { JobList } from "@/components/JobList";
import { searchParamsCache } from "@/lib/search-params";
import { JobStatus } from "@/services/db/schema";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { JobCardSkeleton } from "@/components/JobCardSkeleton";

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

  if (!sessionResult.ok || !sessionResult.value) {
    redirect("/sign-in");
  }

  const { status, source, startDate, endDate, q } =
    await searchParamsCache.parse(searchParams);
  const statusFilter = status === "all" ? undefined : (status as JobStatus);
  const sourceFilter = source === "all" ? undefined : source;

  const [dalListResult, countResult] = await Promise.all([
    jobsDal.listJobs(
      statusFilter,
      sourceFilter,
      20,
      0,
      startDate || undefined,
      endDate || undefined,
    ),
    jobsDal.countJobs(
      statusFilter,
      sourceFilter,
      startDate || undefined,
      endDate || undefined,
    ),
  ]);

  let jobs = dalListResult.ok ? dalListResult.value : [];
  let totalJobs = countResult.ok ? countResult.value : jobs.length;

  // If pipeline is empty on initial dashboard load (no filters applied), automatically trigger initial DRC job crawl
  if (jobs.length === 0 && !statusFilter && !sourceFilter && !startDate && !endDate && !q) {
    try {
      const { runDrcCrawler } = await import("@/services/crawler/run");
      await runDrcCrawler();
      const [reFetched, reCount] = await Promise.all([
        jobsDal.listJobs(
          statusFilter,
          sourceFilter,
          20,
          0,
          startDate || undefined,
          endDate || undefined,
        ),
        jobsDal.countJobs(
          statusFilter,
          sourceFilter,
          startDate || undefined,
          endDate || undefined,
        ),
      ]);
      if (reFetched.ok) {
        jobs = reFetched.value;
      }
      if (reCount.ok) {
        totalJobs = reCount.value;
      }
    } catch (err) {
      console.error("Failed initial auto-crawl on dashboard load:", err);
    }
  }

  return (
    <JobList
      initialJobs={jobs}
      totalJobs={totalJobs}
      statusFilter={statusFilter}
      sourceFilter={sourceFilter}
      startDate={startDate || undefined}
      endDate={endDate || undefined}
      queryFilter={q || undefined}
    />
  );
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value) {
    redirect("/sign-in");
  }

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
