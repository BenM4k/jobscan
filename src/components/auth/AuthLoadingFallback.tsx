"use client";

import React from "react";
import { useTranslations } from "next-intl";

export function AuthLoadingFallback() {
  const t = useTranslations("auth");

  return (
    <div className="py-8 text-center text-xs text-gray-500 dark:text-slate-400">
      {t("processing")}
    </div>
  );
}
