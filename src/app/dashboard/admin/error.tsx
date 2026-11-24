"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ShieldAlert, RotateCcw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error("[Admin Console Error]", error);
  }, [error]);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121215] p-8 text-center space-y-5 shadow-xs">
      <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
        <ShieldAlert className="size-6" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
          {t("adminTitle")}
        </h2>
        <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-md mx-auto">
          {t("adminDescription")}
        </p>
      </div>
      {error.message && (
        <p className="text-xs font-mono text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl p-3 text-left wrap-break-word max-w-xl mx-auto">
          {error.message}
        </p>
      )}
      <div className="flex items-center justify-center gap-3 pt-1">
        <Button type="button" onClick={() => reset()} className="gap-1.5 cursor-pointer">
          <RotateCcw className="size-3.5" />
          <span>{t("tryAgain")}</span>
        </Button>
        <Link
          href="/dashboard"
          className={buttonVariants({ variant: "outline" })}
        >
          {t("backToDashboard")}
        </Link>
      </div>
    </div>
  );
}
