"use client";

import React, { useState } from "react";
import { ResumeProfileData } from "@/lib/ai";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface MasterResumeUploadProps {
  onExtracted: (data: ResumeProfileData, rawText: string) => void;
  disabled?: boolean;
}

export function MasterResumeUpload({ onExtracted, disabled }: MasterResumeUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [stepLabel, setStepLabel] = useState<string>("");
  const t = useTranslations("profile");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      setStepLabel("Extracting text from file...");

      // 1. Call /api/resume/parse
      const formData = new FormData();
      formData.append("file", file);

      const parseRes = await fetch("/api/resume/parse", {
        method: "POST",
        body: formData,
      });

      if (!parseRes.ok) {
        const errJson = await parseRes.json();
        throw new Error(errJson.error || "Failed to parse document");
      }

      const { text: rawText } = await parseRes.json();
      setStepLabel("Extracting structured profile with Gemini 3.6 Flash...");

      // 2. Call /api/resume/extract
      const extractRes = await fetch("/api/resume/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText }),
      });

      if (!extractRes.ok) {
        const errJson = await extractRes.json();
        throw new Error(errJson.error || "Failed to extract structured resume");
      }

      const { data: extractedProfile } = await extractRes.json();
      toast.success("Resume parsed & structured with Gemini AI! Please review before saving.");
      onExtracted(extractedProfile, rawText);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Error processing resume";
      toast.error(message);
    } finally {
      setIsProcessing(false);
      setStepLabel("");
      e.target.value = "";
    }
  };

  return (
    <div className="border-2 border-dashed border-slate-300 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 bg-slate-50/60 dark:bg-[#15151A]/60 flex flex-col items-center justify-center text-center gap-3 transition hover:border-blue-500 shadow-xs">
      <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl shadow-xs">
        📄
      </div>

      <div>
        <h4 className="text-sm font-bold text-gray-900 dark:text-slate-100">
          {t("uploadTitle")}
        </h4>
        <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-sm mt-0.5">
          {t("uploadSubtitle")}
        </p>
      </div>

      {isProcessing ? (
        <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 py-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
          <span>{stepLabel}</span>
        </div>
      ) : (
        <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-md shadow-blue-500/20 inline-flex items-center gap-2">
          <span>{t("chooseFile")}</span>
          <input
            type="file"
            accept=".pdf,.docx,.doc,.txt"
            onChange={handleFileChange}
            disabled={disabled || isProcessing}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
}
