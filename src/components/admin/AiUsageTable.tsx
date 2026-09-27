"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface AiUsageLogItem {
  id: string;
  createdAt: Date | string;
  feature: string;
  provider: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  cacheHit: boolean | null;
  costEstimateUsd: string | null;
  userName?: string | null;
  userEmail?: string | null;
}

interface AiUsageTableProps {
  items: AiUsageLogItem[];
  totalCount: number;
  page: number;
  totalPages: number;
  feature?: string;
  pageSize?: number;
}

function getPageHref(pageNum: number, feature?: string): string {
  const params = new URLSearchParams();
  if (pageNum > 1) {
    params.set("page", String(pageNum));
  }
  if (feature) {
    params.set("feature", feature);
  }
  const qs = params.toString();
  return `/dashboard/admin/ai-usage${qs ? `?${qs}` : ""}`;
}

export function AiUsageTable({
  items,
  totalCount,
  page,
  totalPages,
  feature,
  pageSize = 15,
}: AiUsageTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const startEntry = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endEntry = Math.min(page * pageSize, totalCount);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === page || isPending) return;
    startTransition(() => {
      router.push(getPageHref(newPage, feature));
    });
  };

  return (
    <div className="space-y-4">
      {/* Table with loading indicator overlay */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 shadow-sm">
        {isPending && (
          <div className="absolute inset-0 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center z-10 transition-opacity">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 shadow-md border border-slate-200 dark:border-zinc-800 text-xs font-medium text-slate-700 dark:text-zinc-200">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
              <span>Loading telemetry logs...</span>
            </div>
          </div>
        )}

        <div
          className={`overflow-x-auto transition-opacity duration-200 ${
            isPending ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/80 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                <th className="py-3.5 pl-4 pr-3">Timestamp</th>
                <th className="px-3 py-3.5">Feature</th>
                <th className="px-3 py-3.5">Provider / Model</th>
                <th className="px-3 py-3.5">Tokens (In / Out)</th>
                <th className="px-3 py-3.5">Cache</th>
                <th className="py-3.5 pl-3 pr-4 text-right">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-12 text-center text-sm text-slate-500 dark:text-zinc-400"
                  >
                    No AI call logs found.
                  </td>
                </tr>
              ) : (
                items.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="py-3 pl-4 pr-3 text-xs text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-xs font-medium text-slate-900 dark:text-white">
                      <span className="capitalize">
                        {log.feature.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600 dark:text-zinc-400">
                      <span className="font-semibold text-slate-800 dark:text-zinc-200 capitalize">
                        {log.provider}
                      </span>{" "}
                      / {log.model}
                    </td>
                    <td className="px-3 py-3 text-xs font-mono text-slate-600 dark:text-zinc-400">
                      {log.inputTokens ?? 0} / {log.outputTokens ?? 0}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {log.cacheHit ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                          HIT
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                          MISS
                        </span>
                      )}
                    </td>
                    <td className="py-3 pl-3 pr-4 text-right text-xs font-mono text-slate-700 dark:text-zinc-300">
                      ${Number(log.costEstimateUsd || 0).toFixed(5)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 pt-1 text-xs text-slate-500 dark:text-zinc-400">
        <div>
          Showing {startEntry}–{endEntry} of {totalCount} logs
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1 || isPending}
            onClick={() => handlePageChange(page - 1)}
            className="h-8 px-2 text-xs cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>

          <span className="font-medium text-slate-900 dark:text-white px-1">
            {isPending ? (
              <span className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Updating...
              </span>
            ) : (
              `Page ${page} of ${totalPages}`
            )}
          </span>

          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages || isPending}
            onClick={() => handlePageChange(page + 1)}
            className="h-8 px-2 text-xs cursor-pointer"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
