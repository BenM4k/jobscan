import React from "react";
import { Sparkles, Cpu, Zap, Activity } from "lucide-react";
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
        bar: "bg-linear-to-r from-rose-500 to-red-600",
        text: "text-rose-600 dark:text-rose-400",
        badge: "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60",
        statusText: "Near Limit",
      };
    }
    if (percent >= 70) {
      return {
        bar: "bg-linear-to-r from-amber-500 to-orange-500",
        text: "text-amber-600 dark:text-amber-400",
        badge: "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/60",
        statusText: "High Usage",
      };
    }
    return {
      bar: "bg-linear-to-r from-purple-600 via-indigo-600 to-blue-500",
      text: "text-purple-600 dark:text-purple-400",
      badge: "bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/60",
      statusText: "Normal",
    };
  };

  const status = getStatusClasses(percentUsed);

  // Variant: Sidebar
  if (variant === "sidebar") {
    return (
      <div className={`space-y-2.5 pt-2 ${className}`}>
        <div className="flex justify-between items-center text-xs">
          <span className="font-mono font-bold uppercase tracking-widest text-[10px] text-slate-400 dark:text-zinc-500 flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-purple-500" />
            <span>AI USAGE</span>
          </span>
          <span className="text-slate-800 dark:text-zinc-200 font-bold text-[11px] font-mono">
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

        <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-zinc-500">
          <span>{remainingCount} calls remaining</span>
          <span className="font-mono font-semibold">{percentUsed}%</span>
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
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            <span>AI Credits</span>
          </span>
          <span className="text-xs font-bold font-mono text-gray-900 dark:text-white">
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
    <div className={`bg-white dark:bg-[#121216] rounded-3xl border border-slate-200 dark:border-zinc-800/80 p-6 shadow-sm transition-all ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-900/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
              <span>AI Usage & Monthly Allowance</span>
              <span className={`text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full border ${status.badge}`}>
                {status.statusText}
              </span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
              Track your monthly allocation for scoring, resume tailoring, and custom cover letters.
            </p>
          </div>
        </div>
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-xl font-extrabold font-mono text-gray-900 dark:text-white">
            {usedCount} <span className="text-xs text-gray-400 font-normal">/ {monthlyLimit}</span>
          </span>
          <span className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium">
            {remainingCount} remaining
          </span>
        </div>
      </div>

      {/* Progress Bar Section */}
      <div className="space-y-2.5 mt-6">
        <div className="flex justify-between items-center text-xs">
          <span className="font-semibold text-gray-700 dark:text-zinc-300 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-purple-500" />
            <span>Quota Consumed</span>
          </span>
          <span className="font-mono font-bold text-xs text-gray-900 dark:text-zinc-100">
            {percentUsed}%
          </span>
        </div>

        <div
          role="progressbar"
          aria-label="Monthly AI Usage"
          aria-valuenow={percentUsed}
          aria-valuemin={0}
          aria-valuemax={100}
          className="w-full bg-slate-100 dark:bg-zinc-800/80 h-3 rounded-full overflow-hidden p-0.5 shadow-inner"
        >
          <div
            className={`h-full rounded-full transition-all duration-700 ${status.bar}`}
            style={{ width: `${percentUsed}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-[11px] text-gray-500 dark:text-zinc-400 pt-0.5">
          <span>{usedCount} requests used this month</span>
          <span className="italic">Resets on the 1st of each month</span>
        </div>
      </div>

      {/* Detail Breakdown Stats */}
      {showDetails && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-6 pt-5 border-t border-slate-100 dark:border-zinc-800/60">
          <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-zinc-900/50 border border-slate-100 dark:border-zinc-800/60">
            <div className="flex items-center gap-2 text-gray-500 dark:text-zinc-400 mb-1">
              <Zap className="w-3.5 h-3.5 text-purple-500" />
              <span className="text-[11px] font-medium">Available Calls</span>
            </div>
            <p className="text-sm font-bold font-mono text-gray-900 dark:text-zinc-100">
              {remainingCount} <span className="text-[10px] text-gray-400 font-normal">of {monthlyLimit}</span>
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-zinc-900/50 border border-slate-100 dark:border-zinc-800/60">
            <div className="flex items-center gap-2 text-gray-500 dark:text-zinc-400 mb-1">
              <Cpu className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[11px] font-medium">Tokens Processed</span>
            </div>
            <p className="text-sm font-bold font-mono text-gray-900 dark:text-zinc-100">
              {totalTokens.toLocaleString()}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-zinc-900/50 border border-slate-100 dark:border-zinc-800/60">
            <div className="flex items-center gap-2 text-gray-500 dark:text-zinc-400 mb-1">
              <Activity className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[11px] font-medium">Est. Value Used</span>
            </div>
            <p className="text-sm font-bold font-mono text-gray-900 dark:text-zinc-100">
              ${totalCostEstimateUsd}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
