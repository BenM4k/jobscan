"use client";

import React, { useState } from "react";
import { ResumeProfileData } from "@/lib/ai";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { FileText } from "lucide-react";
import posthog from "posthog-js";
import { useAsyncJobWithRetry } from "@/hooks/useAsyncJobWithRetry";
import { RetryProgressBadge } from "@/components/ui/RetryProgressBadge";

interface MasterResumeUploadProps {
  onExtracted: (data: ResumeProfileData, rawText: string) => void;
  disabled?: boolean;
  isReplacing?: boolean;
}

export function MasterResumeUpload({ onExtracted, disabled, isReplacing }: MasterResumeUploadProps) {
  const [stepLabel, setStepLabel] = useState<string>("");
  const t = useTranslations("profile");

  const retryRunner = useAsyncJobWithRetry<{
    data: ResumeProfileData;
    rawText: string;
  }>({
    jobName: "Resume Parsing & Extraction",
    maxRetries: 2,
    defaultDelaySeconds: 2,
    enableToasts: true,
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await retryRunner.execute(async (attempt) => {
      setStepLabel(
        attempt > 1
          ? `Extracting text (attempt ${attempt})...`
          : "Extracting text from file..."
      );

      // 1. Call /api/resume/parse
      const formData = new FormData();
      formData.append("file", file);

      const parseRes = await fetch("/api/resume/parse", {
        method: "POST",
        body: formData,
      });

      if (!parseRes.ok) {
        const errJson = await parseRes.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed to parse document (${parseRes.status})`);
      }

      const { text: rawText } = await parseRes.json();
      setStepLabel(
        attempt > 1
          ? `Structuring with AI (attempt ${attempt})...`
          : "Structuring profile with Gemini AI..."
      );

      // 2. Call /api/resume/extract
      const extractRes = await fetch("/api/resume/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText }),
      });

      if (!extractRes.ok) {
        const errJson = await extractRes.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed to extract structured resume (${extractRes.status})`);
      }

      const { data: extractedProfile } = await extractRes.json();
      return { data: extractedProfile, rawText };
    });

    if (result) {
      posthog.capture("master_resume_uploaded", { file_type: file.type || "unknown" });
      toast.success("Resume parsed & structured with AI! Please review before saving.");
      onExtracted(result.data, result.rawText);
    }

    setStepLabel("");
    e.target.value = "";
  };

  return (
    <div className="border border-dashed border-slate-300 dark:border-zinc-800 rounded-2xl p-8 sm:p-10 bg-white/60 dark:bg-[#121215]/60 flex flex-col items-center justify-center text-center gap-3 transition hover:border-blue-500 shadow-2xs">
      <FileText className="w-7 h-7 text-blue-600 dark:text-blue-400" />

      <div className="space-y-0.5 max-w-md">
        <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
          {isReplacing ? t("replaceTitle") : t("uploadTitle")}
        </h4>
        <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
          {isReplacing ? t("replaceSubtitle") : t("uploadSubtitle")}
        </p>
      </div>

      <RetryProgressBadge
        status={retryRunner.status}
        attempt={retryRunner.attempt}
        totalAttempts={retryRunner.totalAttempts}
        countdown={retryRunner.countdown}
        message={retryRunner.message}
        onRetryNow={retryRunner.retryNow}
        onCancel={retryRunner.cancelRetry}
      />

      {retryRunner.isLoading ? (
        <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 py-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
          <span>{stepLabel || "Processing..."}</span>
        </div>
      ) : (
        <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-lg transition shadow-xs inline-flex items-center gap-2 mt-1 select-none">
          <span>{t("chooseFile")}</span>
          <input
            type="file"
            accept=".pdf,.docx,.doc,.txt"
            onChange={handleFileChange}
            disabled={disabled || retryRunner.isLoading}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
}
