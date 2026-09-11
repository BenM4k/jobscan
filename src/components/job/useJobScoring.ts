"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { JobSelect } from "@/dal/jobs.dal";
import { useAsyncJobWithRetry } from "@/hooks/useAsyncJobWithRetry";

interface UseJobScoringProps {
  job: JobSelect;
  selectedResumeId?: string;
  onJobUpdated: (job: JobSelect) => void;
}

export function useJobScoring({
  job,
  selectedResumeId,
  onJobUpdated,
}: UseJobScoringProps) {
  const router = useRouter();
  const [missingResumeOpen, setMissingResumeOpen] = useState(false);
  const pendingScoreIdempotencyKeyRef = useRef<string | null>(null);

  const retryRunner = useAsyncJobWithRetry<JobSelect>({
    jobName: "AI Job Scoring",
    maxRetries: 2,
    defaultDelaySeconds: 3,
    enableToasts: true,
  });

  const handleScoreJob = async () => {
    if (!pendingScoreIdempotencyKeyRef.current) {
      pendingScoreIdempotencyKeyRef.current = crypto.randomUUID();
    }
    const idempotencyKey = pendingScoreIdempotencyKeyRef.current;

    const result = await retryRunner.execute(async () => {
      const res = await fetch(`/api/jobs/${job.id}/score`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({ idempotencyKey, resumeId: selectedResumeId }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const msg = errJson.error || `Scoring failed with status ${res.status}`;
        if (msg.toLowerCase().includes("resume") && res.status === 400) {
          setMissingResumeOpen(true);
          // Do not retry missing resume configuration
          retryRunner.cancelRetry();
          throw new Error(msg);
        }

        const errorObj = new Error(msg) as Error & {
          status?: number;
          code?: string;
          retryAfterSeconds?: number;
        };
        errorObj.status = res.status;
        errorObj.code = errJson.code;
        errorObj.retryAfterSeconds = errJson.retryAfterSeconds;
        throw errorObj;
      }

      const { data } = await res.json();
      return data;
    });

    if (result) {
      pendingScoreIdempotencyKeyRef.current = null;
      posthog.capture("job_scored", { location: "detail" });
      onJobUpdated(result);
      router.refresh();
    }
  };

  return {
    isScoring: retryRunner.isLoading,
    status: retryRunner.status,
    attempt: retryRunner.attempt,
    totalAttempts: retryRunner.totalAttempts,
    countdown: retryRunner.countdown,
    scoringError: retryRunner.error,
    scoringMessage: retryRunner.message,
    missingResumeOpen,
    setMissingResumeOpen,
    handleScoreJob,
    cancelRetry: retryRunner.cancelRetry,
    retryNow: retryRunner.retryNow,
  };
}
