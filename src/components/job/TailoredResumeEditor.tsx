"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Loader2, Save, X } from "lucide-react";
import {
  countWords,
  parseTailoredResumeDocument,
  serializeTailoredResumeDocument,
  type TailoredResumeDocument,
} from "@/lib/tailored-resume-document";
import { AtsKeywordBar } from "./AtsKeywordBar";
import { TailoredResumePreview } from "./TailoredResumePreview";
import { TailoredResumeStructuredForm } from "./TailoredResumeStructuredForm";

interface TailoredResumeEditorProps {
  value: string;
  onChange: (next: string) => void;
  language: "en" | "fr";
  isDirty: boolean;
  isSaving: boolean;
  matchedSkills?: string[] | null;
  missingSkills?: string[] | null;
  onSave: (overrideContent?: string) => void;
  onCancel: () => void;
}

type EditorTab = "structured" | "markdown" | "preview";

/** Structured + Markdown + Live Preview editor for tailored resumes. */
export function TailoredResumeEditor({
  value,
  onChange,
  language,
  isDirty,
  isSaving,
  matchedSkills,
  missingSkills,
  onSave,
  onCancel,
}: TailoredResumeEditorProps) {
  const t = useTranslations("jobDetail");
  const tCommon = useTranslations("common");
  const [activeTab, setActiveTab] = useState<EditorTab>("structured");
  const [hasSwitchedTab, setHasSwitchedTab] = useState(false);
  const [structuredDraft, setStructuredDraft] = useState<TailoredResumeDocument>(
    () => parseTailoredResumeDocument(value)
  );
  const [structuredDirty, setStructuredDirty] = useState(false);
  const [prevExternalValue, setPrevExternalValue] = useState(value);

  if (value !== prevExternalValue) {
    setPrevExternalValue(value);
    setStructuredDraft(parseTailoredResumeDocument(value));
    setStructuredDirty(false);
  }

  const commitStructuredDraft = (): string => {
    const serialized = serializeTailoredResumeDocument(structuredDraft, language);
    setPrevExternalValue(serialized);
    setStructuredDirty(false);
    onChange(serialized);
    return serialized;
  };

  const selectTab = (tab: EditorTab) => {
    if (isSaving || tab === activeTab) return;
    if (activeTab === "structured" && structuredDirty) {
      commitStructuredDraft();
    } else if (tab === "structured") {
      setStructuredDraft(parseTailoredResumeDocument(value));
      setStructuredDirty(false);
    }
    setHasSwitchedTab(true);
    setActiveTab(tab);
  };

  const liveDraftText =
    activeTab === "structured" && structuredDirty
      ? serializeTailoredResumeDocument(structuredDraft, language)
      : value;
  const words = countWords(liveDraftText);
  const effectiveDirty = isDirty || structuredDirty;

  const handleStructuredChange = (nextDoc: TailoredResumeDocument) => {
    setStructuredDraft(nextDoc);
    setStructuredDirty(true);
  };

  const handleSaveClick = () => {
    if (!effectiveDirty || isSaving) return;
    if (activeTab === "structured") {
      const committed = commitStructuredDraft();
      onSave(committed);
      return;
    }
    onSave(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      handleSaveClick();
    }
  };

  const tabButtonClass = (tab: EditorTab) =>
    `text-xs font-semibold px-3 py-1 rounded-lg transition-colors duration-300 ease-out cursor-pointer disabled:opacity-50 ${
      activeTab === tab
        ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-2xs"
        : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
    }`;

  return (
    <div
      onKeyDown={handleKeyDown}
      className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 p-4 space-y-4"
    >
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-slate-200 dark:border-zinc-700/60">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => selectTab("structured")}
            className={tabButtonClass("structured")}
          >
            {t("editorTabStructured")}
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => selectTab("markdown")}
            className={tabButtonClass("markdown")}
          >
            {t("editorTabMarkdown")}
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => selectTab("preview")}
            className={tabButtonClass("preview")}
          >
            {t("editorTabPreview")}
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">
            {t("wordCount", { count: words })}
          </span>
          {effectiveDirty && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              {t("unsavedChanges")}
            </span>
          )}
        </div>
      </div>

      {/* Live ATS Keyword Coverage */}
      <AtsKeywordBar
        draftText={liveDraftText}
        matchedSkills={matchedSkills}
        missingSkills={missingSkills}
      />

      {/* Active Editor Body */}
      <div
        key={activeTab}
        className={hasSwitchedTab ? "jp-fade-in" : undefined}
      >
        {activeTab === "structured" && (
          <fieldset disabled={isSaving} className="min-w-0 border-0 p-0 m-0">
            <TailoredResumeStructuredForm
              doc={structuredDraft}
              onDocChange={handleStructuredChange}
            />
          </fieldset>
        )}

        {activeTab === "markdown" && (
          <textarea
            rows={16}
            disabled={isSaving}
            aria-label={t("editorTabMarkdown")}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 p-4 rounded-xl text-base sm:text-xs font-mono leading-relaxed focus:outline-none focus:border-blue-500 shadow-2xs transition-colors duration-300 disabled:opacity-60"
          />
        )}

        {activeTab === "preview" && (
          <div className="rounded-xl border border-border/50 bg-white dark:bg-zinc-950/60 p-4">
            <TailoredResumePreview content={liveDraftText} />
          </div>
        )}
      </div>

      {/* Footer Actions */}
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
            disabled={isSaving}
            className="text-xs gap-1.5 cursor-pointer"
          >
            <X className="size-3.5" />
            <span>{tCommon("cancel")}</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSaveClick}
            disabled={isSaving || !effectiveDirty}
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
