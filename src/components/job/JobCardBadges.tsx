"use client";

import React from "react";

interface JobCardBadgesProps {
  locationText?: string;
  workplaceLabel?: string;
  source?: string | null;
  postedDate?: string | null;
}

export function JobCardBadges({
  locationText,
  workplaceLabel,
  source,
  postedDate,
}: JobCardBadgesProps) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-gray-400 dark:text-zinc-500 font-medium">
      {locationText && (
        <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
          <span aria-hidden="true">📍</span>
          <span>{locationText}</span>
        </span>
      )}

      {workplaceLabel && (
        <span className="bg-[#E0F2FE] dark:bg-cyan-950/50 text-[#0284C7] dark:text-cyan-400 border border-[#BAE6FD] dark:border-cyan-800 text-[11px] font-bold px-2 py-0.5 rounded tracking-wide uppercase">
          {workplaceLabel}
        </span>
      )}

      {source && (
        <span className="font-mono text-[11px] uppercase tracking-wider text-gray-400 dark:text-zinc-500">
          • VIA {source}
        </span>
      )}

      {postedDate && (
        <span className="font-mono text-[11px] uppercase tracking-wider text-gray-400 dark:text-zinc-500">
          • {postedDate}
        </span>
      )}
    </div>
  );
}
