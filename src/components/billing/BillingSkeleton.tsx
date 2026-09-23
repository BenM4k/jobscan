import React from "react";

/** Renders the loading placeholder for the billing dashboard. */
export function BillingSkeleton() {
  return (
    <div className="space-y-12 sm:space-y-14 w-full animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2 border-b border-border/80 pb-8 sm:pb-9 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
        <div className="space-y-2">
          <div className="h-5 w-28 rounded-md bg-muted" />
          <div className="h-8 w-52 rounded-md bg-muted" />
          <div className="h-4 w-72 rounded-md bg-muted" />
        </div>
        <div className="h-16 w-44 rounded-xl bg-muted shrink-0" />
      </div>

      {/* Subscription Section Skeleton */}
      <div className="space-y-6 pb-12 sm:pb-14 border-b border-border/60">
        <div className="h-7 w-48 rounded-md bg-muted" />
        <div className="h-4 w-80 rounded-md bg-muted" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2">
          <div className="h-8 rounded-md bg-muted/60" />
          <div className="h-8 rounded-md bg-muted/60" />
          <div className="h-8 rounded-md bg-muted/60" />
        </div>
        <div className="h-10 w-full sm:w-96 rounded-lg bg-muted" />
      </div>

      {/* Packs Section Skeleton */}
      <div className="space-y-6 pb-12 sm:pb-14 border-b border-border/60">
        <div className="h-7 w-48 rounded-md bg-muted" />
        <div className="h-4 w-72 rounded-md bg-muted" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="h-28 rounded-xl bg-muted/60" />
          <div className="h-28 rounded-xl bg-muted/60" />
          <div className="h-28 rounded-xl bg-muted/60" />
        </div>
        <div className="h-10 w-full sm:w-80 rounded-lg bg-muted" />
      </div>

      {/* Ledger Skeleton with clear item separation */}
      <div className="space-y-6">
        <div className="h-7 w-40 rounded-md bg-muted" />
        <div className="space-y-3 pt-2">
          <div className="h-18 rounded-xl bg-muted/40 border border-border/40" />
          <div className="h-18 rounded-xl bg-muted/40 border border-border/40" />
          <div className="h-18 rounded-xl bg-muted/40 border border-border/40" />
        </div>
      </div>
    </div>
  );
}

