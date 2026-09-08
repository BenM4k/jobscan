"use client";

import { useState, useRef, useEffect } from "react";
import { JobSelect } from "@/dal/jobs.dal";
import { toast } from "sonner";
import posthog from "posthog-js";
import { downloadTextAsPdf } from "@/lib/pdf-export";

interface UseCoverLetterOptions {
  job: JobSelect;
  onJobUpdated: (updated: JobSelect) => void;
}

export function useCoverLetter({ job, onJobUpdated }: UseCoverLetterOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [coverLetter, setCoverLetter] = useState(job.coverLetterDraft || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const pendingIdempotencyKeyRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleGenerateStream = async () => {
    try {
      setIsStreaming(true);
      setCoverLetter("");
      if (!pendingIdempotencyKeyRef.current) {
        pendingIdempotencyKeyRef.current = crypto.randomUUID();
      }
      const idempotencyKey = pendingIdempotencyKeyRef.current;

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
        body: JSON.stringify({ idempotencyKey }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to generate cover letter stream");
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

      pendingIdempotencyKeyRef.current = null;
      posthog.capture("cover_letter_generated");
      toast.success("Cover letter generated");
      onJobUpdated({ ...job, coverLetterDraft: accumulated });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Cover letter streaming failed");
    } finally {
      setIsStreaming(false);
    }
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
      const filename = `Cover_Letter_${job.company.replace(/\s+/g, "_")}.pdf`;
      await downloadTextAsPdf(filename, coverLetter, 11, 6);
      toast.success("PDF downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(coverLetter);
      setIsCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Failed to copy to clipboard");
    }
  };

  return {
    isStreaming,
    coverLetter,
    setCoverLetter,
    isSaving,
    isEditing,
    setIsEditing,
    isCopied,
    hasContent: Boolean(coverLetter),
    handleGenerateStream,
    handleSave,
    handleDownloadPdf,
    handleCopy,
  };
}
