import React from "react";
import { Sparkles, Cpu, Zap, Activity } from "lucide-react";
import { StatBox } from "@/components/shared/StatBox";

export interface AiUsageCardProps {
  usedCount: number;
  monthlyLimit: number;
  remainingCount: number;
  percentUsed: number;
  totalTokens: number;
  totalCostEstimateUsd: string;
  status: {
    bar: string;
    text: string;
    badge: string;
    statusText: string;
  };
  showDetails?: boolean;
  className?: string;
}

export function AiUsageCard({
  usedCount,
  monthlyLimit,
  remainingCount,
  percentUsed,
  totalTokens,
  totalCostEstimateUsd,
  status,
  showDetails = true,
  className = "",
}: AiUsageCardProps) {
  return (
    <div
      className={`bg-white dark:bg-[#121216] rounded-2xl border border-slate-200 dark:border-zinc-800/80 p-6 shadow-2xs transition-all ${className}`}
    >
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

      {/* Detail Breakdown Stats */}
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
