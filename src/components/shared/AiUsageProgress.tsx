import React from "react";
import { Sparkles, Cpu, Zap, Activity } from "lucide-react";
import { StatBox } from "@/components/shared/StatBox";
import type { UserAiUsage } from "@/services/ai/usage.service";

export interface AiUsageProgressProps {
  usage?: UserAiUsage | null;
  variant?: "card" | "sidebar" | "compact";
  className?: string;
  showDetails?: boolean;
}

export function AiUsageProgress({
  usage,
  variant = "card",
  className = "",
  showDetails = true,
}: AiUsageProgressProps) {
  const usedCount = usage?.usedCount ?? 0;
  const monthlyLimit = usage?.monthlyLimit ?? 50;
  const remainingCount = usage?.remainingCount ?? Math.max(0, monthlyLimit - usedCount);
  const percentUsed = usage?.percentUsed ?? Math.min(100, Math.round((usedCount / monthlyLimit) * 100));
  const totalTokens = usage?.totalTokens ?? 0;
  const totalCostEstimateUsd = usage?.totalCostEstimateUsd ?? "0.0000";

  // Dynamic status color based on quota consumption
  const getStatusClasses = (percent: number) => {
    if (percent >= 90) {
      return {
        bar: "bg-rose-600",
        text: "text-rose-600 dark:text-rose-400",
        badge: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60",
        statusText: "Near limit",
      };
    }
    if (percent >= 70) {
      return {
        bar: "bg-amber-500",
        text: "text-amber-600 dark:text-amber-400",
        badge: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60",
        statusText: "High usage",
      };
    }
    return {
      bar: "bg-blue-600",
      text: "text-blue-600 dark:text-blue-400",
      badge: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60",
      statusText: "Normal",
    };
  };

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
    <div className={`bg-white dark:bg-[#121216] rounded-2xl border border-slate-200 dark:border-zinc-800/80 p-6 shadow-2xs transition-all ${className}`}>
      {/* Header with Plain Inline Icon */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-5">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>AI Usage & Monthly Allowance</span>
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-md border ${status.badge}`}>
              {status.statusText}
            </span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
            Track your monthly allocation for scoring, resume tailoring, and custom cover letters.
          </p>
        </div>
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-xl font-bold text-gray-900 dark:text-white">
            {usedCount} <span className="text-xs text-gray-400 font-normal">/ {monthlyLimit}</span>
          </span>
          <span className="text-xs text-gray-500 dark:text-zinc-400 font-medium">
            {remainingCount} remaining
          </span>
        </div>
      </div>

      {/* Progress Bar Section */}
      <div className="space-y-2.5 mt-6">
        <div className="flex justify-between items-center text-xs">
          <span className="font-semibold text-gray-700 dark:text-zinc-300 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Quota consumed</span>
          </span>
          <span className="font-semibold text-xs text-gray-900 dark:text-zinc-100">
            {percentUsed}%
          </span>
        </div>

        <div
          role="progressbar"
          aria-label="Monthly AI Usage"
          aria-valuenow={percentUsed}
          aria-valuemin={0}
          aria-valuemax={100}
          className="w-full bg-slate-100 dark:bg-zinc-800/80 h-2.5 rounded-full overflow-hidden p-0.5 shadow-inner"
        >
          <div
            className={`h-full rounded-full transition-all duration-700 ${status.bar}`}
            style={{ width: `${percentUsed}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-xs text-gray-500 dark:text-zinc-400 pt-0.5">
          <span>{usedCount} requests used this month</span>
          <span className="italic">Resets on the 1st of each month</span>
        </div>
      </div>

      {/* Detail Breakdown Stats - Unified StatBox */}
      {showDetails && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-6 pt-5 border-t border-slate-100 dark:border-zinc-800/60">
          <StatBox
            icon={<Zap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
            label="Available calls"
            value={remainingCount}
            subValue={`of ${monthlyLimit}`}
          />
          <StatBox
            icon={<Cpu className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
            label="Tokens processed"
            value={totalTokens.toLocaleString()}
          />
          <StatBox
            icon={<Activity className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
            label="Est. value used"
            value={`$${totalCostEstimateUsd}`}
          />
        </div>
      )}
    </div>
  );
}
