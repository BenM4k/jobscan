"use client";

import { useEffect, useEffectEvent } from "react";
import { checkPurchaseStatusAction } from "@/actions/billing.actions";

export type BillingPollData = NonNullable<
  Awaited<ReturnType<typeof checkPurchaseStatusAction>>["data"]
>;

interface UseBillingStatusPollingOptions {
  pollingRef: string | null;
  enabled: boolean;
  maxAttempts?: number;
  intervalMs?: number;
  onConfirmed: (data: BillingPollData) => void;
  onFailed: () => void;
  onTimedOut: () => void;
}

/** Polls billing purchase status sequentially until settled, elapsed timeout, or unmount. */
export function useBillingStatusPolling({
  pollingRef,
  enabled,
  maxAttempts = 60,
  intervalMs = 2000,
  onConfirmed,
  onFailed,
  onTimedOut,
}: UseBillingStatusPollingOptions) {
  const handleConfirmed = useEffectEvent(onConfirmed);
  const handleFailed = useEffectEvent(onFailed);
  const handleTimedOut = useEffectEvent(onTimedOut);

  useEffect(() => {
    if (!pollingRef || !enabled) return;

    let stopped = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    const timeoutMs = maxAttempts * intervalMs;
    const deadline = Date.now() + timeoutMs;

    const clearPollTimer = () => {
      if (pollTimer !== null) {
        clearTimeout(pollTimer);
        pollTimer = null;
      }
    };

    const deadlineTimer = setTimeout(() => {
      if (stopped) return;
      stopped = true;
      clearPollTimer();
      handleTimedOut();
    }, timeoutMs);

    const scheduleNext = () => {
      if (stopped) return;
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        stopped = true;
        clearTimeout(deadlineTimer);
        handleTimedOut();
        return;
      }
      pollTimer = setTimeout(() => {
        void runPoll();
      }, Math.min(intervalMs, remaining));
    };

    const runPoll = async () => {
      if (stopped) return;
      try {
        const res = await checkPurchaseStatusAction(pollingRef);
        if (stopped) return;
        if (res.success && res.data) {
          if (res.data.status === "confirmed") {
            stopped = true;
            clearTimeout(deadlineTimer);
            handleConfirmed(res.data);
            return;
          }
          if (res.data.status === "failed") {
            stopped = true;
            clearTimeout(deadlineTimer);
            handleFailed();
            return;
          }
        }
      } catch {
        // Transient network/server rejection: retry until deadline expires.
      }
      scheduleNext();
    };

    scheduleNext();

    return () => {
      stopped = true;
      clearPollTimer();
      clearTimeout(deadlineTimer);
    };
  }, [pollingRef, enabled, maxAttempts, intervalMs]);
}
