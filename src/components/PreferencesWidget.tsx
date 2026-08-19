"use client";

import React, { useTransition, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { setLocaleAction } from "@/actions/locale.actions";
import { Locale } from "@/i18n/routing";

interface PreferencesWidgetProps {
  className?: string;
}

export function PreferencesWidget({ className = "" }: PreferencesWidgetProps) {
  const currentLocale = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const t = useTranslations("common");

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLocaleChange = (newLocale: Locale) => {
    if (newLocale === currentLocale || isPending) return;

    startTransition(async () => {
      await setLocaleAction(newLocale);
      router.refresh();
    });
  };

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <div
      role="group"
      aria-label={t("switchLanguage")}
      className={`inline-flex items-center gap-1.5 p-1 bg-slate-100/90 dark:bg-[#141418] rounded-2xl border border-slate-300 dark:border-zinc-800 shadow-2xs ${className}`}
    >
      {/* Locale Switcher Segment */}
      <div
        className="inline-flex items-center p-0.5 bg-white/70 dark:bg-zinc-900/80 rounded-xl border border-slate-200/80 dark:border-zinc-800 text-[11px] font-bold"
      >
        <button
          type="button"
          onClick={() => handleLocaleChange("en")}
          disabled={isPending}
          aria-pressed={currentLocale === "en"}
          className={`px-2.5 py-1 rounded-lg transition-all duration-200 cursor-pointer ${
            currentLocale === "en"
              ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 font-extrabold shadow-xs border border-slate-300/80 dark:border-zinc-700"
              : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
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
              ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 font-extrabold shadow-xs border border-slate-300/80 dark:border-zinc-700"
              : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
          } ${isPending ? "opacity-60" : ""}`}
        >
          FR
        </button>
      </div>

      {/* Subtle Vertical Divider */}
      <div
        className="w-px h-4 bg-slate-300 dark:border-zinc-700/80 bg-slate-300/80 dark:bg-zinc-800 shrink-0"
        aria-hidden="true"
      />

      {/* Theme Toggle Button */}
      {mounted ? (
        <button
          type="button"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="w-7 h-7 flex items-center justify-center rounded-xl bg-white/70 dark:bg-zinc-900/80 hover:bg-white dark:hover:bg-zinc-800 border border-slate-200/80 dark:border-zinc-800 text-gray-700 dark:text-slate-200 transition-all duration-200 cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
        >
          {isDark ? (
            <Sun className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-slate-700" />
          )}
        </button>
      ) : (
        <div className="w-7 h-7 rounded-xl bg-transparent" />
      )}
    </div>
  );
}
