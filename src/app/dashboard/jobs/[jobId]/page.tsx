import { Suspense } from "react";
import * as jobsDal from "@/dal/jobs.dal";
import { requireSession } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { JobDetailView } from "@/components/job/JobDetailView";

export const instant = false;

interface JobDetailPageProps {
  params: Promise<{ jobId: string }>;
}

async function JobNavbar() {
  const sessionResult = await requireSession();

  if (!sessionResult.ok || !sessionResult.value) {
    redirect("/sign-in");
  }

  return <Navbar userEmail={sessionResult.value.user.email} />;
}

async function JobDetailContent({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const sessionResult = await requireSession();

  if (!sessionResult.ok || !sessionResult.value) {
    redirect("/sign-in");
  }

  const { jobId } = await params;
  const jobResult = await jobsDal.getJobById(jobId);

  if (!jobResult.ok || !jobResult.value) {
    return (
      <div className="text-center py-20 px-6 border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-3xl bg-white/90 dark:bg-slate-900/90 shadow-xl space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto text-2xl font-black">
          ⚠️
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
          Job Posting Not Found
        </h2>
        <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-sm mx-auto">
          The requested opportunity could not be found or may have been removed
          from your pipeline.
        </p>
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-md shadow-blue-500/20"
          >
            ← Back to Pipeline
          </Link>
        </div>
      </div>
    );
  }

  return <JobDetailView initialJob={jobResult.value} />;
}

export default function JobDetailPage({ params }: JobDetailPageProps) {
  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0C] text-gray-900 dark:text-zinc-100 font-sans flex flex-col relative overflow-hidden transition-colors duration-300">
      {/* Subtle Dot Grid Background Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20"
        style={{
          backgroundImage: `radial-gradient(#CBD5E1 1px, transparent 1px)`,
          backgroundSize: `24px 24px`,
        }}
      />

      <Suspense
        fallback={
          <div className="h-16 border-b border-slate-300 dark:border-zinc-800 bg-white/80 dark:bg-[#0A0A0C]/90" />
        }
      >
        <JobNavbar />
      </Suspense>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6 z-10">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
          <Link
            href="/dashboard"
            className="hover:text-blue-600 dark:hover:text-indigo-400 transition font-semibold inline-flex items-center gap-1.5"
          >
            <span>←</span>
            <span>Pipeline</span>
          </Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-slate-200 font-bold truncate max-w-xs">
            Job Opportunity
          </span>
        </div>

        <Suspense
          fallback={
            <div className="space-y-6 animate-pulse">
              <div className="h-44 rounded-3xl bg-slate-200/60 dark:bg-zinc-900/60 border border-slate-300 dark:border-zinc-800" />
              <div className="h-32 rounded-3xl bg-slate-200/60 dark:bg-zinc-900/60 border border-slate-300 dark:border-zinc-800" />
              <div className="h-64 rounded-3xl bg-slate-200/60 dark:bg-zinc-900/60 border border-slate-300 dark:border-zinc-800" />
            </div>
          }
        >
          <JobDetailContent params={params} />
        </Suspense>
      </main>
    </div>
  );
}
