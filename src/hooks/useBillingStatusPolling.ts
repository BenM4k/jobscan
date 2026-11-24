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

/** Polls billing purchase status on an interval with timeout cap and unmount cancellation. */
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

    let cancelled = false;
    let attempts = 0;

    const interval = setInterval(async () => {
      if (cancelled) return;
      attempts += 1;
      if (attempts > maxAttempts) {
        clearInterval(interval);
        handleTimedOut();
        return;
      }

      const res = await checkPurchaseStatusAction(pollingRef);
      if (cancelled) return;
      if (res.success && res.data) {
        if (res.data.status === "confirmed") {
          clearInterval(interval);
          handleConfirmed(res.data);
        } else if (res.data.status === "failed") {
          clearInterval(interval);
          handleFailed();
        }
      }
    }, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pollingRef, enabled, maxAttempts, intervalMs]);
}
