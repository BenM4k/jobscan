"use client";

import React from "react";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { RetryProgressBadge } from "@/components/ui/RetryProgressBadge";
import type { AsyncJobStatus } from "@/hooks/useAsyncJobWithRetry";

export interface SourceResult {
  source: string;
  skipped?: boolean;
  reason?: string;
  message?: string;
  error?: string;
}

export interface FetchStatusFeedbackProps {
  status: AsyncJobStatus;
  attempt: number;
  totalAttempts: number;
  countdown: number;
  message: string;
  onRetryNow: () => void;
  onCancel: () => void;
  sources?: SourceResult[];
  circuitOpenSources?: SourceResult[];
  fetchFailedSources?: SourceResult[];
}

export function FetchStatusFeedback({
  status,
  attempt,
  totalAttempts,
  countdown,
  message,
  onRetryNow,
  onCancel,
  circuitOpenSources = [],
  fetchFailedSources = [],
}: FetchStatusFeedbackProps) {
  const hasCircuitBreaker = circuitOpenSources.length > 0;
  const hasFetchFailed = fetchFailedSources.length > 0;

  return (
    <div className="space-y-2.5 pt-1">
      <RetryProgressBadge
        status={status}
        attempt={attempt}
        totalAttempts={totalAttempts}
        countdown={countdown}
        message={message}
        onRetryNow={onRetryNow}
        onCancel={onCancel}
      />

      {hasCircuitBreaker && (
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 min-w-0">
            <span className="font-semibold">Circuit Breaker Cooldown</span>
            <p className="text-[11px] leading-relaxed opacity-90">
              {circuitOpenSources.map((s) => s.source.toUpperCase()).join(", ")} cooling down due to consecutive external failures.
            </p>
          </div>
        </div>
      )}

      {hasFetchFailed && (
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 min-w-0">
            <span className="font-semibold">Source Fetch Unreachable</span>
            <p className="text-[11px] leading-relaxed opacity-90">
              {fetchFailedSources.map((s) => s.source.toUpperCase()).join(", ")} could not be reached.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
