"use client";

import { useState, useRef } from "react";
import { JobSelect } from "@/dal/jobs.dal";
import { toast } from "sonner";
import posthog from "posthog-js";
import { downloadTextAsPdf } from "@/lib/pdf-export";
import { useAsyncJobWithRetry } from "@/hooks/useAsyncJobWithRetry";

interface UseCoverLetterProps {
  job: JobSelect;
  onJobUpdated: (updated: JobSelect) => void;
}

export interface GenerateCoverLetterOptions {
  regenerate?: boolean;
  instructions?: string;
  tone?: string;
  resumeId?: string;
}

export function useCoverLetter({ job, onJobUpdated }: UseCoverLetterProps) {
  const [coverLetter, setCoverLetter] = useState(job.coverLetterDraft || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pendingIdempotencyKeyRef = useRef<string | null>(null);

  const retryRunner = useAsyncJobWithRetry<string>({
    jobName: "Cover Letter Generation",
    maxRetries: 2,
    defaultDelaySeconds: 3,
    enableToasts: true,
  });

  const handleGenerateStream = async (options?: GenerateCoverLetterOptions) => {
    const isRegeneration =
      options?.regenerate ||
      Boolean(job.coverLetterDraft) ||
      Boolean(coverLetter);

    if (isRegeneration) {
      // Always mint a fresh idempotency key when regenerating
      pendingIdempotencyKeyRef.current = crypto.randomUUID();
    } else if (!pendingIdempotencyKeyRef.current) {
      pendingIdempotencyKeyRef.current = crypto.randomUUID();
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
          instructions: options?.instructions,
          tone: options?.tone,
          resumeId: options?.resumeId,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
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

      if (!res.body) throw new Error("No readable stream response received");

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
      await downloadTextAsPdf(content, `${job.company || "Company"}-Cover-Letter.pdf`);
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
    cancelRetry: retryRunner.cancelRetry,
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
  };
}
