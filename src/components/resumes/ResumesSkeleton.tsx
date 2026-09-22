import React from "react";

export function ResumesSkeleton() {
  return (
    <div className="space-y-6 w-full animate-pulse">
      {/* Top action bar skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="h-4 w-44 rounded-md bg-muted" />
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="h-8 w-16 rounded-xl bg-muted" />
          <div className="h-8 w-28 rounded-xl bg-muted" />
        </div>
      </div>

      {/* Cards Skeleton List */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-border/60 p-5 bg-card text-card-foreground space-y-4 shadow-2xs"
          >
            {/* Card Header Skeleton */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="h-4 w-32 rounded-md bg-muted" />
                  <div className="h-5 w-24 rounded-full bg-muted" />
                  <div className="h-5 w-10 rounded-full bg-muted" />
                  <div className="h-5 w-12 rounded-full bg-muted" />
                  <div className="h-5 w-20 rounded-full bg-muted" />
                </div>
                <div className="h-3 w-28 rounded-md bg-muted" />
              </div>

              {/* Action Buttons Skeleton */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="h-8 w-24 rounded-lg bg-muted" />
                <div className="h-8 w-24 rounded-lg bg-muted" />
                <div className="h-8 w-8 rounded-lg bg-muted" />
              </div>
            </div>

            {/* Content Preview Snippet Skeleton */}
            <div className="rounded-lg bg-muted/40 p-3.5 border border-border/40 space-y-2">
              <div className="h-3 w-full rounded bg-muted/70" />
              <div className="h-3 w-5/6 rounded bg-muted/70" />
              <div className="h-3 w-2/3 rounded bg-muted/70" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
