import "server-only";

import React from "react";
import { getUserAiUsage } from "@/services/ai/usage.service";
import { AiUsageProgress } from "@/components/shared/AiUsageProgress";

export function AiUsageSidebarSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-2.5 pt-2 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-3.5 w-20 rounded bg-slate-200 dark:bg-zinc-800" />
        <div className="h-3.5 w-10 rounded bg-slate-200 dark:bg-zinc-800" />
      </div>
      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-zinc-800" />
      <div className="flex justify-between items-center">
        <div className="h-3 w-24 rounded bg-slate-200 dark:bg-zinc-800" />
        <div className="h-3 w-8 rounded bg-slate-200 dark:bg-zinc-800" />
      </div>
    </div>
  );
}

/** Uncached server slot streaming live AI usage into ProfileSidebar. */
export async function ProfileAiUsageSlot({ userId }: { userId: string }) {
  const aiUsageResult = await getUserAiUsage(userId);
  const aiUsage = aiUsageResult.ok ? aiUsageResult.value : null;
  const aiUsageError = !aiUsageResult.ok;

  return (
    <AiUsageProgress variant="sidebar" usage={aiUsage} error={aiUsageError} />
  );
}
