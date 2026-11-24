"use client";

import { Trash2, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FeatureFlagAssignmentWithUser } from "@/services/flags";

interface ActiveOverridesTableProps {
  overrides: FeatureFlagAssignmentWithUser[];
  isPending: boolean;
  onRemove: (userId: string, flagKey: string, email: string) => void;
}

/** Displays active per-user feature flag overrides with remove controls. */
export function ActiveOverridesTable({
  overrides,
  isPending,
  onRemove,
}: ActiveOverridesTableProps) {
  return (
    <div className="bg-white dark:bg-[#121216] rounded-2xl border border-slate-200 dark:border-zinc-800/80 p-6 shadow-2xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-4">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span>Active Per-User Overrides ({overrides.length})</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
            Explicit user overrides queried via database SQL join with user
            emails.
          </p>
        </div>
      </div>

      {overrides.length === 0 ? (
        <div className="text-center py-8 text-xs text-gray-500 dark:text-zinc-400">
          No per-user overrides currently active. All users follow global
          default states.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-zinc-800 text-gray-500 dark:text-zinc-400">
                <th className="py-2.5 font-semibold">User Email</th>
                <th className="py-2.5 font-semibold">Feature Flag</th>
                <th className="py-2.5 font-semibold">State</th>
                <th className="py-2.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
              {overrides.map((item) => (
                <tr
                  key={`${item.userId}-${item.flagKey}`}
                  className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/50"
                >
                  <td className="py-3 font-medium text-gray-900 dark:text-zinc-200">
                    {item.userEmail}
                  </td>
                  <td className="py-3 font-mono text-gray-700 dark:text-zinc-300">
                    {item.flagKey}
                  </td>
                  <td className="py-3">
                    {item.enabled ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 dark:text-green-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Enabled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
                        <XCircle className="w-3.5 h-3.5" />
                        Disabled
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        onRemove(item.userId, item.flagKey, item.userEmail)
                      }
                      disabled={isPending}
                      className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
