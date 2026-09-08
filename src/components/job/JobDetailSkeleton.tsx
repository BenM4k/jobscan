import React from "react";

export function JobDetailSkeleton() {
  return (
    <div className="divide-y divide-border/40 animate-pulse">
      {/* Header Skeleton */}
      <header className="pb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2 min-w-0 flex-1">
            <div className="w-24 h-4 rounded bg-muted" />
            <div className="w-3/4 sm:w-1/2 h-7 rounded bg-muted" />
            <div className="w-32 h-4 rounded bg-muted" />
            <div className="flex items-center gap-3 pt-1">
              <div className="w-20 h-4 rounded bg-muted" />
              <div className="w-24 h-4 rounded bg-muted" />
              <div className="w-28 h-4 rounded bg-muted" />
            </div>
          </div>
          <div className="flex items-center sm:flex-col sm:items-end gap-3 sm:gap-2.5 shrink-0">
            <div className="w-24 h-8 rounded bg-muted" />
          </div>
        </div>
      </header>

      {/* Match Score Row Skeleton */}
      <div className="py-4.5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="size-[18px] rounded-full bg-muted shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <div className="w-28 h-4 rounded bg-muted" />
            <div className="w-64 h-3.5 rounded bg-muted" />
          </div>
        </div>
        <div className="w-24 h-4 rounded bg-muted shrink-0" />
      </div>

      {/* Tailored Resume Row Skeleton */}
      <div className="py-4.5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="size-[18px] rounded-full bg-muted shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <div className="w-32 h-4 rounded bg-muted" />
            <div className="w-72 h-3.5 rounded bg-muted" />
          </div>
        </div>
        <div className="w-28 h-4 rounded bg-muted shrink-0" />
      </div>

      {/* Cover Letter Row Skeleton */}
      <div className="py-4.5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="size-[18px] rounded-full bg-muted shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <div className="w-24 h-4 rounded bg-muted" />
            <div className="w-60 h-3.5 rounded bg-muted" />
          </div>
        </div>
        <div className="w-28 h-4 rounded bg-muted shrink-0" />
      </div>

      {/* Description Skeleton */}
      <div className="py-6 space-y-3">
        <div className="w-32 h-4 rounded bg-muted" />
        <div className="space-y-2 pt-1">
          <div className="w-full h-3.5 rounded bg-muted" />
          <div className="w-5/6 h-3.5 rounded bg-muted" />
          <div className="w-4/6 h-3.5 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
