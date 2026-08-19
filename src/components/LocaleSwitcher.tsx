"use client";

import React, { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { setLocaleAction } from "@/actions/locale.actions";
import { Locale } from "@/i18n/routing";

export function LocaleSwitcher() {
  const currentLocale = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("common");

  const handleLocaleChange = (newLocale: Locale) => {
    if (newLocale === currentLocale || isPending) return;

    startTransition(async () => {
      await setLocaleAction(newLocale);
      router.refresh();
    });
  };

  return (
    <div
      role="group"
      aria-label={t("switchLanguage")}
      className="inline-flex items-center p-0.5 bg-slate-100 dark:bg-zinc-800 rounded-xl border border-slate-300 dark:border-zinc-700/80 shadow-2xs text-xs font-semibold text-gray-700 dark:text-zinc-300"
    >
      <button
        type="button"
        onClick={() => handleLocaleChange("en")}
        disabled={isPending}
        aria-pressed={currentLocale === "en"}
        className={`px-2.5 py-1 rounded-lg transition-all duration-200 cursor-pointer ${
          currentLocale === "en"
            ? "bg-white dark:bg-[#121215] text-blue-600 dark:text-blue-400 font-bold shadow-xs border border-slate-200/80 dark:border-zinc-700"
            : "hover:text-gray-900 dark:hover:text-white"
        } ${isPending ? "opacity-60" : ""}`}
      >
        EN
      </button>

      <button
        type="button"
        onClick={() => handleLocaleChange("fr")}
        disabled={isPending}
        aria-pressed={currentLocale === "fr"}
        className={`px-2.5 py-1 rounded-lg transition-all duration-200 cursor-pointer ${
          currentLocale === "fr"
            ? "bg-white dark:bg-[#121215] text-blue-600 dark:text-blue-400 font-bold shadow-xs border border-slate-200/80 dark:border-zinc-700"
            : "hover:text-gray-900 dark:hover:text-white"
        } ${isPending ? "opacity-60" : ""}`}
      >
        FR
      </button>
    </div>
  );
}
