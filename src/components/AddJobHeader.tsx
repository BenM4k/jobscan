import React from "react";
import { useTranslations } from "next-intl";

export function AddJobHeader() {
  const t = useTranslations("addJob");

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-md border border-indigo-500/20 font-sans">
          {t("sourceManual")}
        </span>
      </div>
      <h1 className="text-2xl sm:text-3xl font-sans font-semibold tracking-tight text-gray-900 dark:text-slate-100">
        {t("title")}
      </h1>
      <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 max-w-xl font-sans leading-relaxed">
        {t("subtitle")}
      </p>
    </div>
  );
}
