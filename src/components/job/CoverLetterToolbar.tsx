"use client";

import React from "react";
import { useTranslations } from "next-intl";

interface CoverLetterToolbarProps {
  hasContent: boolean;
  isCopied: boolean;
  isSaving: boolean;
  isStreaming: boolean;
  onCopy: () => void;
  onDownloadPdf: () => void;
  onSave: () => void;
  onGenerateStream: () => void;
}

export function CoverLetterToolbar({
  hasContent,
  isCopied,
  isSaving,
  isStreaming,
  onCopy,
  onDownloadPdf,
  onSave,
  onGenerateStream,
}: CoverLetterToolbarProps) {
  const t = useTranslations("jobDetail");
  const tCommon = useTranslations("common");

  if (!hasContent) {
    return (
      <button
        type="button"
        onClick={onGenerateStream}
        disabled={isStreaming}
        className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer shrink-0"
      >
        {isStreaming ? (
          <>
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>{t("streamingCoverLetter")}</span>
          </>
        ) : (
          <>
            <span>+</span>
            <span>Generate Cover Letter</span>
          </>
        )}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 shrink-0">
      <button
        type="button"
        onClick={onCopy}
        className="bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-xl transition border border-slate-200 dark:border-zinc-700 cursor-pointer"
      >
        {isCopied ? `✓ ${tCommon("copied")}` : `📋 ${tCommon("copy")}`}
      </button>

      <button
        type="button"
        onClick={onDownloadPdf}
        className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl transition shadow-xs cursor-pointer"
      >
        📥 {tCommon("downloadPdf")}
      </button>

      <button
        type="button"
        onClick={onSave}
        disabled={isSaving || isStreaming}
        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl transition disabled:opacity-50 cursor-pointer"
      >
        {isSaving ? t("saving") : `💾 ${t("saveCoverLetter")}`}
      </button>

      <button
        type="button"
        onClick={onGenerateStream}
        disabled={isStreaming}
        className="bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 text-xs font-semibold px-3.5 py-1.5 rounded-xl transition disabled:opacity-50 cursor-pointer"
      >
        {isStreaming ? "..." : t("reStream")}
      </button>
    </div>
  );
}
