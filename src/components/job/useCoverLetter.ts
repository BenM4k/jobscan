"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { JobSelect } from "@/dal/jobs.dal";
import { toast } from "sonner";
import posthog from "posthog-js";
import { downloadTextAsPdf } from "@/lib/pdf-export";
import { useAsyncJobWithRetry } from "@/hooks/useAsyncJobWithRetry";

interface UseCoverLetterProps {
  job: JobSelect;
  onJobUpdated: (updated: JobSelect) => void;
  selectedResumeId?: string;
}

export interface GenerateCoverLetterOptions {
  regenerate?: boolean;
  instructions?: string;
  tone?: string;
  resumeId?: string;
}

export function useCoverLetter({ job, onJobUpdated, selectedResumeId }: UseCoverLetterProps) {
  const [coverLetter, setCoverLetter] = useState(job.coverLetterDraft || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isInsufficientCreditsOpen, setIsInsufficientCreditsOpen] = useState(false);
  const [insufficientCreditsData, setInsufficientCreditsData] = useState<{
    requiredCost: number;
    currentBalance: number;
  }>({ requiredCost: 5, currentBalance: 0 });
  const abortControllerRef = useRef<AbortController | null>(null);
  const pendingIdempotencyKeyRef = useRef<string | null>(null);
  const pendingResumeIdRef = useRef<string | undefined>(undefined);

  const retryRunner = useAsyncJobWithRetry<string>({
    jobName: "Cover Letter Generation",
    maxRetries: 2,
    defaultDelaySeconds: 3,
    enableToasts: true,
  });

  const cancelRetry = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    pendingIdempotencyKeyRef.current = null;
    pendingResumeIdRef.current = undefined;
    retryRunner.cancelRetry();
  }, [retryRunner]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const handleGenerateStream = async (options?: GenerateCoverLetterOptions) => {
    const isOptionsObj =
      options && typeof options === "object" && !("nativeEvent" in options);
    const safeOptions = isOptionsObj ? options : undefined;

    const isRegeneration =
      safeOptions?.regenerate ||
      Boolean(job.coverLetterDraft) ||
      Boolean(coverLetter);

    const targetResumeId = safeOptions?.resumeId || selectedResumeId;

    if (isRegeneration) {
      // Always mint a fresh idempotency key when regenerating
      pendingIdempotencyKeyRef.current = crypto.randomUUID();
      pendingResumeIdRef.current = targetResumeId;
    } else if (
      !pendingIdempotencyKeyRef.current ||
      pendingResumeIdRef.current !== targetResumeId
    ) {
      pendingIdempotencyKeyRef.current = crypto.randomUUID();
      pendingResumeIdRef.current = targetResumeId;
    }
    const idempotencyKey = pendingIdempotencyKeyRef.current;

    const result = await retryRunner.execute(async () => {
      setCoverLetter("");
      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const res = await fetch(`/api/jobs/${job.id}/cover-letter`, {
        method: "POST",
        signal: abortController.signal,
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          idempotencyKey,
          regenerate: isRegeneration,
          instructions: safeOptions?.instructions,
          tone: safeOptions?.tone,
          resumeId: targetResumeId,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        if (res.status === 402 || errJson.code === "insufficient_credits") {
          setIsInsufficientCreditsOpen(true);
          setInsufficientCreditsData({
            requiredCost: errJson.details?.requiredCost ?? 5,
            currentBalance: errJson.details?.currentBalance ?? 0,
          });
        }
        const msg = errJson.error || `Failed to generate cover letter (${res.status})`;
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

      if (!res.body) {
        throw new Error("No response body received from server");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setCoverLetter(accumulated);
      }

      return accumulated;
    });

    if (result) {
      pendingIdempotencyKeyRef.current = null;
      pendingResumeIdRef.current = undefined;
      posthog.capture("cover_letter_generated");
      onJobUpdated({ ...job, coverLetterDraft: result });
    }
  };

  const handleRegenerate = async (
    options?: Omit<GenerateCoverLetterOptions, "regenerate">
  ) => {
    return handleGenerateStream({ ...options, regenerate: true });
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const res = await fetch(`/api/jobs/${job.id}/cover-letter`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverLetter }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to save cover letter");
      }

      const { data } = await res.json();
      posthog.capture("cover_letter_saved");
      onJobUpdated(data);
      toast.success("Cover letter saved");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const content = coverLetter || job.coverLetterDraft;
      if (!content) return;
      await downloadTextAsPdf(`${job.company || "Company"}-Cover-Letter.pdf`, content);
      toast.success("Downloaded cover letter PDF");
    } catch (err) {
      console.error(err);
      toast.error("Failed to download PDF");
    }
  };

  const handleCopy = async () => {
    try {
      const textToCopy = coverLetter || job.coverLetterDraft || "";
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Failed to copy to clipboard");
    }
  };

  return {
    isStreaming: retryRunner.isLoading,
    retryStatus: retryRunner.status,
    retryAttempt: retryRunner.attempt,
    totalAttempts: retryRunner.totalAttempts,
    retryCountdown: retryRunner.countdown,
    retryMessage: retryRunner.message,
    cancelRetry,
    retryNow: retryRunner.retryNow,
    coverLetter,
    setCoverLetter,
    isSaving,
    isEditing,
    setIsEditing,
    isCopied,
    hasCoverLetter: Boolean(job.coverLetterDraft),
    handleGenerateStream,
    handleRegenerate,
    handleSave,
    handleDownloadPdf,
    handleCopy,
    isInsufficientCreditsOpen,
    setIsInsufficientCreditsOpen,
    insufficientCreditsData,
  };
}
