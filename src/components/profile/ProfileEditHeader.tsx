"use client";

import React from "react";
import { useTranslations } from "next-intl";

interface ProfileEditHeaderProps {
  hasResume: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onSave: () => void;
}

export function ProfileEditHeader({
  hasResume,
  isSaving,
  onCancel,
  onSave,
}: ProfileEditHeaderProps) {
  const t = useTranslations("profile");

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight">
          {t("title")}
        </h2>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
          {t("subtitle")}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {hasResume && (
          <button
            type="button"
            onClick={onCancel}
            className="bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 font-semibold text-xs px-4 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-700 transition cursor-pointer shadow-2xs"
          >
            {t("cancel")}
          </button>
        )}

        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition shadow-xs disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? t("saving") : t("saveAsMaster")}
        </button>
      </div>
    </div>
  );
}
