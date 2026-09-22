import React from "react";
import { JobCardSkeleton } from "@/components/JobCardSkeleton";
import { Loader2 } from "lucide-react";

interface JobListSkeletonProps {
  message?: string;
}

export function JobListSkeleton({
  message = "Updating opportunities...",
}: JobListSkeletonProps) {
  return (
    <section
      aria-label="Loading job opportunities"
      className="space-y-4 pt-2 animate-in fade-in duration-150"
    >
      <div className="flex justify-between items-center text-xs text-gray-400 dark:text-zinc-500 pt-2 pb-2">
        <div className="flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400" />
          <span className="font-medium text-slate-500 dark:text-zinc-400">
            {message}
          </span>
        </div>
        <div className="w-24 h-4 rounded-md bg-slate-200/80 dark:bg-zinc-800 animate-pulse" />
      </div>
      <div className="space-y-4">
        <JobCardSkeleton />
        <JobCardSkeleton />
        <JobCardSkeleton />
      </div>
    </section>
  );
}
