"use client";

import { useState, useRef } from "react";
import { JobSelect } from "@/dal/jobs.dal";
import { toast } from "sonner";
import posthog from "posthog-js";
import { downloadTextAsPdf } from "@/lib/pdf-export";

export interface ParsedTailoredResume {
  summary: string;
  experience: string[];
}

export function parseTailoredResume(
  text?: string | null,
  structured?: unknown
): ParsedTailoredResume {
  if (structured && typeof structured === "object") {
    const s = structured as Record<string, unknown>;
    const summary = typeof s.summary === "string" ? s.summary : "";
    const experience: string[] = [];

    if (Array.isArray(s.experience)) {
      for (const item of s.experience) {
        if (item && Array.isArray(item.bullets)) {
          for (const b of item.bullets) {
            if (typeof b === "string" && b.trim()) {
              experience.push(b.trim().replace(/^[•\-\*]\s*/, ""));
              if (experience.length >= 2) break;
            }
          }
        }
        if (experience.length >= 2) break;
      }
    }

    if (summary || experience.length > 0) {
      return {
        summary: summary || "Tailored summary aligned to this position.",
        experience,
      };
    }
  }

  if (!text) {
    return { summary: "", experience: [] };
  }

  let summary = "";
  const experience: string[] = [];

  const summaryMatch = text.match(/##\s*Summary\s*([\s\S]*?)(?=##|$)/i);
  if (summaryMatch && summaryMatch[1]) {
    summary = summaryMatch[1].trim();
  }

  const expMatch = text.match(/##\s*(?:Work Experience|Experience|Relevant Experience)\s*([\s\S]*?)(?=##|$)/i);
  if (expMatch && expMatch[1]) {
    const lines = expMatch[1]
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));

    for (const line of lines) {
      const clean = line.replace(/^[•\-\*]\s*/, "");
      if (clean) {
        experience.push(clean);
        if (experience.length >= 2) break;
      }
    }
  }

  if (!summary && !experience.length) {
    const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    if (paragraphs.length > 0) {
      summary = paragraphs[0];
      if (paragraphs.length > 1) {
        for (let i = 1; i < Math.min(paragraphs.length, 3); i++) {
          experience.push(paragraphs[i].replace(/^[•\-\*]\s*/, ""));
        }
      }
    }
  }

  return {
    summary: summary || text,
    experience,
  };
}

interface UseTailoredResumeOptions {
  job: JobSelect;
  onJobUpdated: (updated: JobSelect) => void;
}

export function useTailoredResume({ job, onJobUpdated }: UseTailoredResumeOptions) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedResume, setEditedResume] = useState(job.tailoredResume || "");
  const [isCopied, setIsCopied] = useState(false);
  const pendingIdempotencyKeyRef = useRef<string | null>(null);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      if (!pendingIdempotencyKeyRef.current) {
        pendingIdempotencyKeyRef.current = crypto.randomUUID();
      }
      const idempotencyKey = pendingIdempotencyKeyRef.current;
      const res = await fetch(`/api/jobs/${job.id}/tailor-resume`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({ idempotencyKey }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to generate tailored resume");
      }

      const { data, tailoredResume } = await res.json();
      pendingIdempotencyKeyRef.current = null;
      posthog.capture("tailored_resume_generated");
      setEditedResume(tailoredResume);
      onJobUpdated(data);
      toast.success("Tailored resume generated");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Tailoring failed");
    } finally {
      setIsGenerating(false);
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
      const filename = `Tailored_Resume_${job.company.replace(/\s+/g, "_")}.pdf`;
      await downloadTextAsPdf(filename, content, 10.5, 5.5);
      toast.success("PDF downloaded");
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
    isGenerating,
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
