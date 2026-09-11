"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";

export type AsyncJobStatus = "idle" | "running" | "retrying" | "success" | "error";

export interface RetryInfo {
  attempt: number;
  maxRetries: number;
  countdown: number;
  message: string;
}

export interface UseAsyncJobWithRetryOptions {
  jobName: string;
  maxRetries?: number;
  defaultDelaySeconds?: number;
  enableToasts?: boolean;
}

export interface RateLimitedPayload {
  code?: string;
  retryAfterSeconds?: number;
  error?: string;
}

export function useAsyncJobWithRetry<T>({
  jobName,
  maxRetries = 2,
  defaultDelaySeconds = 3,
  enableToasts = true,
}: UseAsyncJobWithRetryOptions) {
  const [status, setStatus] = useState<AsyncJobStatus>("idle");
  const [attempt, setAttempt] = useState(1);
  const [countdown, setCountdown] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const toastIdRef = useRef<string | number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const nextAttemptFnRef = useRef<(() => void) | null>(null);
  const isCancelledRef = useRef(false);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const cancelRetry = useCallback(() => {
    isCancelledRef.current = true;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    nextAttemptFnRef.current = null;
    setStatus("idle");
    setCountdown(0);
    setMessage("");
    if (toastIdRef.current && enableToasts) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }
  }, [enableToasts]);

  const retryNow = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCountdown(0);
    if (nextAttemptFnRef.current) {
      const executeNext = nextAttemptFnRef.current;
      nextAttemptFnRef.current = null;
      executeNext();
    }
  }, []);

  const execute = useCallback(
    async (fn: (currentAttempt: number) => Promise<T>): Promise<T | null> => {
      isCancelledRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      let currentAttempt = 1;
      const totalAttempts = maxRetries + 1;

      while (currentAttempt <= totalAttempts) {
        if (isCancelledRef.current) return null;

        setAttempt(currentAttempt);
        setStatus(currentAttempt > 1 ? "retrying" : "running");
        setError(null);

        const activeMsg =
          currentAttempt > 1
            ? `${jobName}: Retrying (attempt ${currentAttempt} of ${totalAttempts})...`
            : `${jobName}: Processing...`;
        setMessage(activeMsg);

        if (enableToasts) {
          if (!toastIdRef.current) {
            toastIdRef.current = toast.loading(activeMsg);
          } else {
            toast.loading(activeMsg, { id: toastIdRef.current });
          }
        }

        try {
          const result = await fn(currentAttempt);
          if (isCancelledRef.current) return null;

          setStatus("success");
          setMessage(`${jobName} completed`);

          if (enableToasts && toastIdRef.current) {
            const successMsg =
              currentAttempt > 1
                ? `${jobName} succeeded on attempt ${currentAttempt}`
                : `${jobName} completed successfully`;
            toast.success(successMsg, { id: toastIdRef.current });
            toastIdRef.current = null;
          }

          return result;
        } catch (err: unknown) {
          if (isCancelledRef.current) return null;

          const rawError = err instanceof Error ? err.message : String(err);
          const parsedPayload = (err as Record<string, unknown>) || {};
          const isRateLimited =
            parsedPayload.code === "rate_limited" ||
            rawError.toLowerCase().includes("rate limit") ||
            parsedPayload.status === 429;

          const waitSeconds =
            typeof parsedPayload.retryAfterSeconds === "number" &&
            parsedPayload.retryAfterSeconds > 0
              ? Math.ceil(parsedPayload.retryAfterSeconds)
              : isRateLimited
              ? 10
              : defaultDelaySeconds * currentAttempt;

          if (currentAttempt < totalAttempts) {
            setStatus("retrying");
            setCountdown(waitSeconds);

            // Wait with a 1-second countdown ticker
            await new Promise<void>((resolve) => {
              let remaining = waitSeconds;
              nextAttemptFnRef.current = () => {
                if (timerRef.current) clearInterval(timerRef.current);
                timerRef.current = null;
                resolve();
              };

              const updateCountdownText = (sec: number) => {
                const retryMsg = isRateLimited
                  ? `${jobName}: Rate limit hit. Retrying in ${sec}s (attempt ${currentAttempt + 1} of ${totalAttempts})...`
                  : `${jobName}: Temporary issue. Retrying in ${sec}s (attempt ${currentAttempt + 1} of ${totalAttempts})...`;
                setMessage(retryMsg);
                if (enableToasts && toastIdRef.current) {
                  toast.loading(retryMsg, { id: toastIdRef.current });
                }
              };

              updateCountdownText(remaining);

              timerRef.current = setInterval(() => {
                remaining -= 1;
                setCountdown(remaining);
                if (remaining <= 0) {
                  if (timerRef.current) clearInterval(timerRef.current);
                  timerRef.current = null;
                  nextAttemptFnRef.current = null;
                  resolve();
                } else {
                  updateCountdownText(remaining);
                }
              }, 1000);
            });

            currentAttempt += 1;
          } else {
            // Retries exhausted
            setStatus("error");
            setError(rawError);
            const failMsg =
              currentAttempt > 1
                ? `${jobName} failed after ${totalAttempts} attempts: ${rawError}`
                : `${jobName} failed: ${rawError}`;
            setMessage(failMsg);

            if (enableToasts && toastIdRef.current) {
              toast.error(failMsg, { id: toastIdRef.current });
              toastIdRef.current = null;
            }

            return null;
          }
        }
      }

      return null;
    },
    [jobName, maxRetries, defaultDelaySeconds, enableToasts]
  );

  return {
    status,
    attempt,
    maxRetries,
    totalAttempts: maxRetries + 1,
    countdown,
    message,
    error,
    isLoading: status === "running" || status === "retrying",
    isRetrying: status === "retrying",
    execute,
    cancelRetry,
    retryNow,
  };
}
