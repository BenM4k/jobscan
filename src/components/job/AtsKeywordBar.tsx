"use client";

import React from "react";
import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { computeKeywordCoverage } from "@/lib/ats-keywords";

interface AtsKeywordBarProps {
  draftText: string;
  matchedSkills?: string[] | null;
  missingSkills?: string[] | null;
}

/** Displays live ATS keyword coverage split cleanly into Covered and Missing groups. */
export function AtsKeywordBar({
  draftText,
  matchedSkills,
  missingSkills,
}: AtsKeywordBarProps) {
  const t = useTranslations("jobDetail");
  const coverage = computeKeywordCoverage(draftText, matchedSkills, missingSkills);

  if (coverage.total === 0) return null;

  const handleCopyKeyword = async (keyword: string) => {
    try {
      await navigator.clipboard.writeText(keyword);
      toast.success(t("keywordCopied", { keyword }));
    } catch {
      // Clipboard unavailable
    }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-white/80 dark:bg-zinc-900/50 p-3.5 space-y-3">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-foreground dark:text-zinc-200">
            {t("atsKeywordCoverage")}
          </span>
          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
            {t("atsKeywordCount", {
              covered: coverage.covered.length,
              total: coverage.total,
              percent: coverage.percent,
            })}
          </span>
        </div>

        <div
          role="progressbar"
          aria-valuenow={coverage.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden"
        >
          <div
            className="h-full rounded-full bg-emerald-500 dark:bg-emerald-400 transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ width: `${coverage.percent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2.5 border-t border-border/40">
        {/* Covered Keywords */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            {t("atsCoveredHeading")} ({coverage.covered.length})
          </div>
          {coverage.covered.length === 0 ? (
            <p className="text-xs text-muted-foreground">—</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {coverage.covered.map((kw) => (
                <span
                  key={`cov-${kw}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 transition-colors duration-300 ease-out"
                >
                  <Check className="size-3 shrink-0" />
                  <span>{kw}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Missing Keywords */}
        <div className="space-y-1.5 md:border-l md:border-border/40 md:pl-3.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            {t("atsMissingHeading")} ({coverage.missing.length})
          </div>
          {coverage.missing.length === 0 ? (
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              {t("atsAllCovered")}
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {coverage.missing.map((kw) => (
                <button
                  key={`miss-${kw}`}
                  type="button"
                  onClick={() => void handleCopyKeyword(kw)}
                  title={t("copyMissingKeywordHint")}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors duration-300 ease-out cursor-pointer"
                >
                  <span>{kw}</span>
                  <Copy className="size-2.5 opacity-70" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
