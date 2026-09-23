"use client";

import React from "react";
import { LayoutGrid, List } from "lucide-react";
import { useTranslations } from "next-intl";

interface ResumesViewSwitcherProps {
  viewMode: "grid" | "list";
  onChange: (mode: "grid" | "list") => void;
}

export function ResumesViewSwitcher({
  viewMode,
  onChange,
}: ResumesViewSwitcherProps) {
  const t = useTranslations("resumes");

  return (
    <div
      role="group"
      aria-label={t("viewMode")}
      className="flex items-center p-0.5 bg-slate-100 dark:bg-zinc-800/80 rounded-xl border border-slate-200 dark:border-zinc-700/60"
    >
      <button
        type="button"
        onClick={() => onChange("list")}
        aria-label={t("listView")}
        title={t("listView")}
        className={`p-1.5 rounded-lg transition cursor-pointer ${
          viewMode === "list"
            ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-2xs"
            : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
        }`}
      >
        <List className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange("grid")}
        aria-label={t("gridView")}
        title={t("gridView")}
        className={`p-1.5 rounded-lg transition cursor-pointer ${
          viewMode === "grid"
            ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-2xs"
            : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
        }`}
      >
        <LayoutGrid className="size-4" />
      </button>
    </div>
  );
}
