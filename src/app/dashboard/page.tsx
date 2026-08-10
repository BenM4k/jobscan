import { Suspense } from "react";
import * as jobsDal from "@/dal/jobs.dal";
import { requireSession } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import { ClientShell } from "@/components/ClientShell";
import { JobList } from "@/components/JobList";
import { Navbar } from "@/components/layout/Navbar";
import { searchParamsCache } from "@/lib/search-params";
import { JobStatus } from "@/services/db/schema";
import { NuqsAdapter } from "nuqs/adapters/next/app";

interface DashboardPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function DashboardNavbar() {
  const sessionResult = await requireSession();

  if (!sessionResult.ok || !sessionResult.value) {
    redirect("/sign-in");
  }

  return <Navbar userEmail={sessionResult.value.user.email} />;
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

  const { status, source, startDate, endDate } =
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
  if (jobs.length === 0 && !statusFilter && !sourceFilter && !startDate && !endDate) {
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
    />
  );
}

export default function DashboardPage({ searchParams }: DashboardPageProps) {
  return (
    <NuqsAdapter>
      <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0C] text-gray-900 dark:text-zinc-100 font-sans flex flex-col relative overflow-hidden transition-colors duration-300">
        {/* Subtle Dot Grid Background Pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20"
          style={{
            backgroundImage: `radial-gradient(#CBD5E1 1px, transparent 1px)`,
            backgroundSize: `24px 24px`,
          }}
        />

        <Suspense fallback={<Navbar userEmail="" />}>
          <DashboardNavbar />
        </Suspense>

        <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-8 z-10">
          <ClientShell>
            <Suspense
              fallback={
                <div className="space-y-4">
                  <div className="h-44 rounded-3xl bg-slate-200/60 dark:bg-zinc-900/60 border border-slate-300 dark:border-zinc-800 animate-pulse" />
                  <div className="h-44 rounded-3xl bg-slate-200/60 dark:bg-zinc-900/60 border border-slate-300 dark:border-zinc-800 animate-pulse" />
                </div>
              }
            >
              <DashboardFeed searchParams={searchParams} />
            </Suspense>
          </ClientShell>
        </main>
      </div>
    </NuqsAdapter>
  );
}
