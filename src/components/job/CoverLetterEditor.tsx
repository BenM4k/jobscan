"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Loader2, Save, X } from "lucide-react";
import { countWords } from "@/lib/tailored-resume-document";
import { AtsKeywordBar } from "./AtsKeywordBar";

interface CoverLetterEditorProps {
  value: string;
  onChange: (next: string) => void;
  isDirty: boolean;
  isSaving: boolean;
  isStreaming: boolean;
  matchedSkills?: string[] | null;
  missingSkills?: string[] | null;
  onSave: () => void;
  onCancel: () => void;
}

/** Write/Preview cover-letter editor with word count, keyword coverage, and Cmd/Ctrl+S save. */
export function CoverLetterEditor({
  value,
  onChange,
  isDirty,
  isSaving,
  isStreaming,
  matchedSkills,
  missingSkills,
  onSave,
  onCancel,
}: CoverLetterEditorProps) {
  const t = useTranslations("jobDetail");
  const tCommon = useTranslations("common");
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [hasSwitchedTab, setHasSwitchedTab] = useState(false);

  const selectTab = (next: "write" | "preview") => {
    if (next !== tab) {
      setHasSwitchedTab(true);
      setTab(next);
    }
  };

  const words = countWords(value);
  const lengthStatus =
    words > 450 ? t("lengthLong") : words < 180 ? t("lengthShort") : t("lengthIdeal");

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      if (isDirty && !isSaving && !isStreaming) {
        onSave();
      }
    }
  };

  const tabClass = (mode: "write" | "preview") =>
    `text-xs font-semibold px-3 py-1 rounded-lg transition-colors duration-300 ease-out cursor-pointer ${
      tab === mode
        ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-2xs"
        : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
    }`;

  return (
    <div
      onKeyDown={handleKeyDown}
      className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 p-4 space-y-3.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-slate-200 dark:border-zinc-700/60">
          <button type="button" onClick={() => selectTab("write")} className={tabClass("write")}>
            {t("editorTabWrite")}
          </button>
          <button type="button" onClick={() => selectTab("preview")} className={tabClass("preview")}>
            {t("editorTabPreview")}
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">
            {t("wordCount", { count: words })} · {lengthStatus}
          </span>
          {isDirty && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              {t("unsavedChanges")}
            </span>
          )}
        </div>
      </div>

      <AtsKeywordBar
        draftText={value}
        matchedSkills={matchedSkills}
        missingSkills={missingSkills}
      />

      <div
        key={tab}
        className={hasSwitchedTab ? "jp-fade-in" : undefined}
      >
        {tab === "write" ? (
          <textarea
            rows={12}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={isStreaming}
            className="w-full bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 p-4 rounded-xl text-base sm:text-sm leading-relaxed font-sans focus:outline-none focus:border-blue-500 shadow-2xs transition-colors duration-300"
          />
        ) : (
          <div className="rounded-xl border border-border/50 bg-white dark:bg-zinc-950/60 p-4">
            <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600 dark:text-zinc-300">
              {value}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/40">
        <span className="text-[11px] text-muted-foreground hidden sm:inline">
          {t("saveShortcutHint")}
        </span>
        <div className="flex items-center gap-2 ml-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isSaving || isStreaming}
            className="text-xs gap-1.5 cursor-pointer"
          >
            <X className="size-3.5" />
            <span>{tCommon("cancel")}</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onSave}
            disabled={isSaving || isStreaming || !isDirty}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 cursor-pointer"
          >
            {isSaving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            <span>{isSaving ? t("saving") : t("saveDraft")}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
