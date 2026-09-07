"use client";

import React from "react";
import { RotateCcw, Copy, Download, Save, Check } from "lucide-react";

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
  if (!hasContent) {
    return (
      <button
        type="button"
        onClick={onGenerateStream}
        disabled={isStreaming}
        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1.5 p-0 bg-transparent border-0 cursor-pointer disabled:opacity-50 shrink-0 font-sans"
      >
        <span>Generate letter</span>
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-4 shrink-0 font-sans">
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving || isStreaming}
        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1.5 p-0 bg-transparent border-0 cursor-pointer disabled:opacity-50 font-sans"
      >
        <Save className="size-[18px] shrink-0" />
        <span>{isSaving ? "Saving" : "Save draft"}</span>
      </button>

      <button
        type="button"
        onClick={onCopy}
        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1.5 p-0 bg-transparent border-0 cursor-pointer font-sans"
      >
        {isCopied ? <Check className="size-[18px] shrink-0" /> : <Copy className="size-[18px] shrink-0" />}
        <span>{isCopied ? "Copied" : "Copy text"}</span>
      </button>

      <button
        type="button"
        onClick={onDownloadPdf}
        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1.5 p-0 bg-transparent border-0 cursor-pointer font-sans"
      >
        <Download className="size-[18px] shrink-0" />
        <span>Download PDF</span>
      </button>

      <button
        type="button"
        onClick={onGenerateStream}
        disabled={isStreaming}
        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1.5 p-0 bg-transparent border-0 cursor-pointer disabled:opacity-50 font-sans"
      >
        <RotateCcw className="size-[18px] shrink-0" />
        <span>Regenerate letter</span>
      </button>
    </div>
  );
}
