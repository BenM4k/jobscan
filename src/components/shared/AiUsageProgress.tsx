import React from "react";
import { Sparkles, Zap } from "lucide-react";
import { AiUsageCard } from "@/components/shared/AiUsageCard";
import type { UserAiUsage } from "@/services/ai/usage.service";

export interface AiUsageProgressProps {
  usage?: UserAiUsage | null;
  error?: boolean | string | null;
  variant?: "card" | "sidebar" | "compact";
  className?: string;
  showDetails?: boolean;
}

const STATUS_CONFIGS = {
  high: {
    bar: "bg-rose-600",
    text: "text-rose-600 dark:text-rose-400",
    badge: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60",
    statusText: "Near limit",
  },
  medium: {
    bar: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    badge: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60",
    statusText: "High usage",
  },
  normal: {
    bar: "bg-blue-600",
    text: "text-blue-600 dark:text-blue-400",
    badge: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60",
    statusText: "Normal",
  },
};

function getStatusClasses(percent: number) {
  if (percent >= 90) return STATUS_CONFIGS.high;
  if (percent >= 70) return STATUS_CONFIGS.medium;
  return STATUS_CONFIGS.normal;
}

export function AiUsageProgress({
  usage,
  error = false,
  variant = "card",
  className = "",
  showDetails = true,
}: AiUsageProgressProps) {
  if (error) {
    if (variant === "sidebar") {
      return (
        <div className={`space-y-2.5 pt-2 ${className}`}>
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
              <span>AI usage</span>
            </span>
          </div>
          <div className="rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 p-2.5 text-xs text-red-600 dark:text-red-400">
            Failed to load AI usage details.
          </div>
        </div>
      );
    }
    if (variant === "compact") {
      return (
        <div className={`text-xs text-red-500 ${className}`}>
          Failed to load AI credits.
        </div>
      );
    }
    return (
      <div className={`rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 p-6 text-sm text-red-600 dark:text-red-400 ${className}`}>
        Failed to load AI usage details. Please refresh the page to retry.
      </div>
    );
  }

  const usedCount = usage?.usedCount ?? 0;
  const monthlyLimit = usage?.monthlyLimit ?? 50;
  const remainingCount = usage?.remainingCount ?? Math.max(0, monthlyLimit - usedCount);
  const percentUsed = usage?.percentUsed ?? Math.min(100, Math.round((usedCount / monthlyLimit) * 100));
  const totalTokens = usage?.totalTokens ?? 0;
  const totalCostEstimateUsd = usage?.totalCostEstimateUsd ?? "0.0000";
  const status = getStatusClasses(percentUsed);

  // Variant: Sidebar
  if (variant === "sidebar") {
    return (
      <div className={`space-y-2.5 pt-2 ${className}`}>
        <div className="flex justify-between items-center text-xs">
          <span className="font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>AI usage</span>
          </span>
          <span className="text-slate-800 dark:text-zinc-200 font-semibold text-xs">
            {usedCount}/{monthlyLimit}
          </span>
        </div>

        <div
          role="progressbar"
          aria-label="AI monthly usage allowance"
          aria-valuenow={percentUsed}
          aria-valuemin={0}
          aria-valuemax={100}
          className="w-full bg-slate-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden"
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ${status.bar}`}
            style={{ width: `${percentUsed}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-xs text-slate-500 dark:text-zinc-400">
          <span>{remainingCount} calls remaining</span>
          <span className="font-medium">{percentUsed}%</span>
        </div>
      </div>
    );
  }

  // Variant: Compact
  if (variant === "compact") {
    return (
      <div className={`space-y-1.5 ${className}`}>
        <div className="flex justify-between items-center text-xs">
          <span className="font-medium text-gray-700 dark:text-zinc-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>AI credits</span>
          </span>
          <span className="text-xs font-semibold text-gray-900 dark:text-white">
            {usedCount}/{monthlyLimit} ({percentUsed}%)
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="AI monthly credits usage"
          aria-valuenow={percentUsed}
          aria-valuemin={0}
          aria-valuemax={100}
          className="w-full bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden"
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ${status.bar}`}
            style={{ width: `${percentUsed}%` }}
          />
        </div>
      </div>
    );
  }

  // Variant: Card (Default for Settings page)
  return (
    <AiUsageCard
      usedCount={usedCount}
      monthlyLimit={monthlyLimit}
      remainingCount={remainingCount}
      percentUsed={percentUsed}
      totalTokens={totalTokens}
      totalCostEstimateUsd={totalCostEstimateUsd}
      status={status}
      showDetails={showDetails}
      className={className}
    />
  );
}
