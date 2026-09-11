"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { RefreshCw, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RetryProgressBadge } from "@/components/ui/RetryProgressBadge";
import { useAsyncJobWithRetry } from "@/hooks/useAsyncJobWithRetry";

export function JobListEmptyState() {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [bgSyncActive, setBgSyncActive] = useState(true);

  const checkSyncRunner = useAsyncJobWithRetry<boolean>({
    jobName: "Background Ingestion Sync",
    maxRetries: 2,
    defaultDelaySeconds: 4,
    enableToasts: true,
  });

  const handleManualCheck = async () => {
    const found = await checkSyncRunner.execute(async () => {
      // Refresh Next.js server components to check for ingested jobs
      router.refresh();

      // Check current window location with cache-busting fetch to verify if new jobs arrived
      const res = await fetch(`/api/jobs/more?offset=0&limit=1&_t=${Date.now()}`);
      if (!res.ok) {
        throw new Error(`Sync check returned status ${res.status}`);
      }
      const data = await res.json().catch(() => ({}));
      const jobCount = Array.isArray(data?.data) ? data.data.length : 0;

      if (jobCount === 0) {
        throw new Error("Background search in progress. No jobs ready yet.");
      }

      return true;
    });

    if (found) {
      setBgSyncActive(false);
      window.location.reload();
    }
  };

  return (
    <div className="text-center py-12 sm:py-16 px-6 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-xl shadow-gray-200/40 dark:shadow-none transition-all duration-300 space-y-5">
      <div className="w-14 h-14 rounded-2xl bg-linear-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center mx-auto text-2xl font-black shadow-lg shadow-blue-500/25">
        ✦
      </div>

      <div className="space-y-1 max-w-md mx-auto">
        <h3 className="text-lg font-black text-gray-900 dark:text-slate-100">
          {t("emptyTitle")}
        </h3>
        <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
          {t("emptySubtitle")}
        </p>
      </div>

      {/* Background Ingestion Live Feedback State */}
      <div className="max-w-sm mx-auto space-y-3 pt-1">
        {bgSyncActive && checkSyncRunner.status === "idle" && (
          <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-left flex items-start gap-3">
            <div className="relative mt-0.5 shrink-0">
              <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
            </div>
            <div className="space-y-0.5 min-w-0 flex-1 text-xs">
              <span className="font-semibold text-blue-900 dark:text-blue-200">
                {t("bgIngestionActive")}
              </span>
              <p className="text-[11px] text-blue-700/80 dark:text-blue-300/80 leading-relaxed">
                {t("bgIngestionDesc")}
              </p>
            </div>
          </div>
        )}

        <RetryProgressBadge
          status={checkSyncRunner.status}
          attempt={checkSyncRunner.attempt}
          totalAttempts={checkSyncRunner.totalAttempts}
          countdown={checkSyncRunner.countdown}
          message={checkSyncRunner.message}
          onRetryNow={checkSyncRunner.retryNow}
          onCancel={checkSyncRunner.cancelRetry}
        />

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={checkSyncRunner.isLoading}
          onClick={handleManualCheck}
          className="gap-2 text-xs font-medium rounded-xl h-8.5 px-4 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${checkSyncRunner.isLoading ? "animate-spin text-blue-600" : ""}`} />
          <span>{checkSyncRunner.isLoading ? t("checkingBgIngestion") : t("checkForIngestedJobs")}</span>
        </Button>
      </div>
    </div>
  );
}
