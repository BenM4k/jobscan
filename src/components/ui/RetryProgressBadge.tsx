"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { RefreshCw, XCircle, AlertCircle, Sparkles } from "lucide-react";
import type { AsyncJobStatus } from "@/hooks/useAsyncJobWithRetry";

export interface RetryProgressBadgeProps {
  status: AsyncJobStatus;
  attempt: number;
  totalAttempts: number;
  countdown: number;
  message?: string;
  onRetryNow?: () => void;
  onCancel?: () => void;
  className?: string;
}

export function RetryProgressBadge({
  status,
  attempt,
  totalAttempts,
  countdown,
  message,
  onRetryNow,
  onCancel,
  className = "",
}: RetryProgressBadgeProps) {
  const t = useTranslations("retry");

  if (status === "idle" || status === "success") {
    return null;
  }

  if (status === "retrying") {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs transition-all duration-200 animate-in fade-in ${className}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <RefreshCw className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-spin shrink-0" />
          <div className="min-w-0">
            <div className="font-semibold flex items-center gap-1.5">
              <span>{t("attemptCount", { attempt, total: totalAttempts })}</span>
              {countdown > 0 && (
                <span className="bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono px-1.5 py-0.5 rounded text-[11px]">
                  {t("inSeconds", { seconds: countdown })}
                </span>
              )}
            </div>
            {message && (
              <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80 truncate">
                {message}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onRetryNow && (
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={onRetryNow}
              className="h-7 text-xs border-amber-500/40 hover:bg-amber-500/20 text-amber-800 dark:text-amber-200 cursor-pointer"
            >
              {t("retryNow")}
            </Button>
          )}
          {onCancel && (
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={onCancel}
              className="h-7 px-2 text-xs text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5 mr-1" />
              {t("cancel")}
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (status === "running" && attempt > 1) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/30 text-blue-900 dark:text-blue-200 text-xs animate-pulse ${className}`}
      >
        <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
        <span className="font-medium">
          {t("executingRetry", { attempt, total: totalAttempts })}
        </span>
      </div>
    );
  }

  if (status === "error" && message) {
    return (
      <div
        role="alert"
        className={`flex items-center justify-between gap-2 p-2.5 rounded-xl bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs ${className}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
          <span className="truncate">{message}</span>
        </div>
        {onRetryNow && (
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={onRetryNow}
            className="h-6 text-[11px] border-rose-500/40 hover:bg-rose-500/20 text-rose-800 dark:text-rose-200 shrink-0 cursor-pointer"
          >
            {t("retry")}
          </Button>
        )}
      </div>
    );
  }

  return null;
}
