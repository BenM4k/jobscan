"use client";

import { useState, useRef } from "react";
import { JobSelect } from "@/dal/jobs.dal";
import { toast } from "sonner";
import posthog from "posthog-js";
import { downloadTextAsPdf } from "@/lib/pdf-export";
import { parseTailoredResume, ParsedTailoredResume } from "@/lib/tailored-resume-parser";
import { useAsyncJobWithRetry } from "@/hooks/useAsyncJobWithRetry";

export type { ParsedTailoredResume };
export { parseTailoredResume };

interface UseTailoredResumeOptions {
  job: JobSelect;
  onJobUpdated: (updated: JobSelect) => void;
}

export function useTailoredResume({ job, onJobUpdated }: UseTailoredResumeOptions) {
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedResume, setEditedResume] = useState(job.tailoredResume || "");
  const [isCopied, setIsCopied] = useState(false);
  const pendingIdempotencyKeyRef = useRef<string | null>(null);

  const retryRunner = useAsyncJobWithRetry<{
    data: JobSelect;
    tailoredResume: string;
  }>({
    jobName: "Tailored Resume Generation",
    maxRetries: 2,
    defaultDelaySeconds: 3,
    enableToasts: true,
  });

  const handleGenerate = async () => {
    if (!pendingIdempotencyKeyRef.current) {
      pendingIdempotencyKeyRef.current = crypto.randomUUID();
    }
    const idempotencyKey = pendingIdempotencyKeyRef.current;

    const result = await retryRunner.execute(async () => {
      const res = await fetch(`/api/jobs/${job.id}/tailor-resume`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({ idempotencyKey }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const msg = errJson.error || `Tailoring failed with status ${res.status}`;
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

      return await res.json();
    });

    if (result) {
      pendingIdempotencyKeyRef.current = null;
      posthog.capture("tailored_resume_generated");
      setEditedResume(result.tailoredResume);
      onJobUpdated(result.data);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const res = await fetch(`/api/jobs/${job.id}/tailor-resume`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tailoredResume: editedResume }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to save tailored resume");
      }

      const { data } = await res.json();
      posthog.capture("tailored_resume_saved");
      onJobUpdated(data);
      toast.success("Tailored resume saved");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPdf = async (content: string) => {
    try {
      await downloadTextAsPdf(`${job.company || "Company"}-Tailored-Resume.pdf`, content);
      toast.success("Downloaded tailored resume PDF");
    } catch (err) {
      console.error(err);
      toast.error("Failed to download PDF");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedResume || job.tailoredResume || "");
      setIsCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Failed to copy to clipboard");
    }
  };

  const parsedResume = parseTailoredResume(
    editedResume || job.tailoredResume,
    job.tailoredResumeData
  );

  return {
    isGenerating: retryRunner.isLoading,
    retryStatus: retryRunner.status,
    retryAttempt: retryRunner.attempt,
    totalAttempts: retryRunner.totalAttempts,
    retryCountdown: retryRunner.countdown,
    retryMessage: retryRunner.message,
    cancelRetry: retryRunner.cancelRetry,
    retryNow: retryRunner.retryNow,
    isSaving,
    isEditing,
    setIsEditing,
    editedResume,
    setEditedResume,
    isCopied,
    hasResume: Boolean(job.tailoredResume),
    parsedResume,
    handleGenerate,
    handleSave,
    handleDownloadPdf,
    handleCopy,
  };
}
