"use client";

import React from "react";
import { useTranslations } from "next-intl";

export function JobListEmptyState() {
  const t = useTranslations("dashboard");

  return (
    <div className="text-center py-16 px-6 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-xl shadow-gray-200/40 dark:shadow-none transition-all duration-300">
      <div className="w-14 h-14 rounded-2xl bg-linear-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center mx-auto mb-4 text-2xl font-black shadow-lg shadow-blue-500/25">
        ✦
      </div>
      <h3 className="text-lg font-black text-gray-900 dark:text-slate-100">
        {t("emptyTitle")}
      </h3>
      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
        {t("emptySubtitle")}
      </p>
    </div>
  );
}
