"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export type CoverLetterTone = "professional" | "enthusiastic" | "concise" | "direct";

interface CoverLetterOptionsBarProps {
  hasExistingDraft: boolean;
  isStreaming: boolean;
  onGenerate: (options: { tone: CoverLetterTone; instructions?: string }) => void;
  onCancel: () => void;
}

const TONES: CoverLetterTone[] = ["professional", "enthusiastic", "concise", "direct"];

/** Collapsible tone & custom-instructions selector wired to cover-letter streaming API. */
export function CoverLetterOptionsBar({
  hasExistingDraft,
  isStreaming,
  onGenerate,
  onCancel,
}: CoverLetterOptionsBarProps) {
  const t = useTranslations("jobDetail");
  const tCommon = useTranslations("common");
  const [tone, setTone] = useState<CoverLetterTone>("professional");
  const [instructions, setInstructions] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({
      tone,
      instructions: instructions.trim() || undefined,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/40 p-3.5 space-y-3"
    >
      <div className="space-y-1.5">
        <span className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
          {t("coverLetterToneLabel")}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {TONES.map((item) => (
            <button
              key={item}
              type="button"
              disabled={isStreaming}
              onClick={() => setTone(item)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors duration-300 ease-out cursor-pointer ${
                tone === item
                  ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                  : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-blue-400"
              }`}
            >
              {t(`tone_${item}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="cover-letter-instructions"
          className="block text-xs font-semibold text-slate-700 dark:text-zinc-300"
        >
          {t("coverLetterInstructionsLabel")}
        </label>
        <textarea
          id="cover-letter-instructions"
          rows={2}
          maxLength={1000}
          disabled={isStreaming}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder={t("coverLetterInstructionsPlaceholder")}
          className="w-full bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 text-base sm:text-xs p-2.5 rounded-xl focus:outline-none focus:border-blue-500 shadow-2xs transition-colors duration-300"
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isStreaming}
          className="text-xs cursor-pointer"
        >
          {tCommon("cancel")}
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={isStreaming}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 cursor-pointer"
        >
          {hasExistingDraft ? (
            <RotateCcw className="size-3.5" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          <span>
            {hasExistingDraft ? t("regenerateLetter") : t("generateCoverLetter")}
          </span>
          <span className="opacity-80 text-[11px]">({t("cost5Credits")})</span>
        </Button>
      </div>
    </form>
  );
}
