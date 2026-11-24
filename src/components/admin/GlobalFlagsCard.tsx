"use client";

import { ShieldCheck } from "lucide-react";
import type { UserFeatureFlagView } from "@/services/flags";

interface GlobalFlagsCardProps {
  flags: UserFeatureFlagView[];
  isPending: boolean;
  onToggle: (flagKey: string, currentGlobal: boolean) => void;
}

/** Renders global production feature flag switches for administrators. */
export function GlobalFlagsCard({
  flags,
  isPending,
  onToggle,
}: GlobalFlagsCardProps) {
  return (
    <div className="bg-white dark:bg-[#121216] rounded-2xl border border-slate-200 dark:border-zinc-800/80 p-6 shadow-2xs">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-5">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Global Feature Flags Rollout</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
            Toggle global production availability. Individual user overrides
            take precedence over global toggles.
          </p>
        </div>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-zinc-800/60 mt-2">
        {flags.map((flag) => {
          const isEnabled = flag.enabledGlobally;

          return (
            <div
              key={flag.id}
              className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-4 last:pb-2"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-gray-900 dark:text-zinc-200">
                    {flag.key}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                      isEnabled
                        ? "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/60"
                        : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700/60"
                    }`}
                  >
                    Global: {isEnabled ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-zinc-400">
                  {flag.description || "System feature flag"}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => onToggle(flag.key, isEnabled)}
                  disabled={isPending}
                  aria-label={`Toggle global state for ${flag.key}`}
                  aria-pressed={isEnabled}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    isEnabled
                      ? "bg-blue-600"
                      : "bg-slate-200 dark:bg-zinc-800"
                  } ${isPending ? "opacity-60" : ""}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      isEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
