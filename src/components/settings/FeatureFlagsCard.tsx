"use client";

import { useTransition, useState } from "react";
import { Sparkles, RotateCcw } from "lucide-react";
import { setFeatureFlagOverrideAction } from "@/actions/settings.actions";
import { toast } from "sonner";
import type { UserFeatureFlagView } from "@/services/flags";

interface FeatureFlagsCardProps {
  flags: UserFeatureFlagView[];
}

export function FeatureFlagsCard({ flags: initialFlags }: FeatureFlagsCardProps) {
  const [flags, setFlags] = useState<UserFeatureFlagView[]>(initialFlags);
  const [isPending, startTransition] = useTransition();

  const handleToggle = (flagKey: string, currentEffective: boolean) => {
    const nextVal = !currentEffective;
    const prevRecord = flags.find((f) => f.key === flagKey);

    // Optimistic state update
    setFlags((prev) =>
      prev.map((f) =>
        f.key === flagKey
          ? { ...f, userOverride: nextVal, effectiveEnabled: nextVal }
          : f
      )
    );

    startTransition(async () => {
      const res = await setFeatureFlagOverrideAction(flagKey, nextVal);
      if (!res.success) {
        toast.error(res.error || "Failed to update feature flag");
        if (prevRecord) {
          setFlags((prev) =>
            prev.map((f) => (f.key === flagKey ? prevRecord : f))
          );
        }
      } else {
        toast.success(
          nextVal
            ? `Enabled ${flagKey} for your account`
            : `Disabled ${flagKey} for your account`
        );
      }
    });
  };

  const handleReset = (flagKey: string) => {
    // Find global state to revert to
    const prevRecord = flags.find((f) => f.key === flagKey);
    const globalState = prevRecord?.enabledGlobally ?? false;

    setFlags((prev) =>
      prev.map((f) =>
        f.key === flagKey
          ? { ...f, userOverride: null, effectiveEnabled: globalState }
          : f
      )
    );

    startTransition(async () => {
      const res = await setFeatureFlagOverrideAction(flagKey, null);
      if (!res.success) {
        toast.error(res.error || "Failed to reset feature flag");
        if (prevRecord) {
          setFlags((prev) =>
            prev.map((f) => (f.key === flagKey ? prevRecord : f))
          );
        }
      } else {
        toast.success(`Reset ${flagKey} to system default`);
      }
    });
  };

  return (
    <div className="bg-white dark:bg-[#121216] rounded-2xl border border-slate-200 dark:border-zinc-800/80 p-6 shadow-2xs transition-all">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-5">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Feature Flags & Experimental Previews</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
            Opt into beta AI capabilities and upcoming ATS integrations. Personal overrides take precedence over global rollouts.
          </p>
        </div>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-zinc-800/60 mt-2">
        {flags.map((flag) => {
          const hasOverride = flag.userOverride !== null;
          const isEnabled = flag.effectiveEnabled;

          return (
            <div
              key={flag.id}
              className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-4 last:pb-2"
            >
              <div className="space-y-1.5 max-w-xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-gray-900 dark:text-zinc-200">
                    {flag.key}
                  </span>

                  {hasOverride ? (
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                      Personal override: {flag.userOverride ? "Active" : "Disabled"}
                    </span>
                  ) : (
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700/60">
                      System default ({flag.enabledGlobally ? "On" : "Off"})
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
                  {flag.description || "Experimental pipeline feature flag."}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                {hasOverride && (
                  <button
                    type="button"
                    onClick={() => handleReset(flag.key)}
                    disabled={isPending}
                    title="Reset to system default"
                    aria-label={`Reset ${flag.key} to system default`}
                    className="p-1.5 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleToggle(flag.key, isEnabled)}
                  disabled={isPending}
                  aria-label={`Toggle ${flag.key}`}
                  aria-pressed={isEnabled}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
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
