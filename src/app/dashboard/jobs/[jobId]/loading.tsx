import React from "react";
import Link from "next/link";
import { JobDetailSkeleton } from "@/components/job/JobDetailSkeleton";
import { DashboardFooter } from "@/components/layout/DashboardFooter";

export default function JobDetailLoading() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0C] text-gray-900 dark:text-zinc-100 font-sans flex flex-col relative overflow-hidden transition-colors duration-300">
      {/* Navbar placeholder */}
      <div className="h-16 border-b border-slate-300 dark:border-zinc-800 bg-white/80 dark:bg-[#0A0A0C]/90" />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 z-10">
        {/* Breadcrumb Skeleton */}
        <div className="flex items-center gap-2.5 font-mono text-xs text-gray-500 dark:text-zinc-400">
          <Link
            href="/dashboard"
            className="hover:text-gray-900 dark:hover:text-white transition font-medium inline-flex items-center gap-1.5"
          >
            <span>←</span>
            <span>Pipeline</span>
          </Link>
          <span className="text-gray-400 dark:text-zinc-600">/</span>
          <span className="text-gray-700 dark:text-zinc-300 font-medium">
            Job Opportunity
          </span>
        </div>

        <JobDetailSkeleton />
      </main>

      <DashboardFooter />
    </div>
  );
}
