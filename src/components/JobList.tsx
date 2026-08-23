"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { JobSelect } from "@/dal/jobs.dal";
import { JobStatus } from "@/services/db/schema";
import {
  transitionJobStatusAction,
  scoreJobAction,
  fetchMoreJobsAction,
  deleteJobAction,
  restoreJobAction,
} from "@/actions/job.actions";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { JobCardItem } from "@/components/job/JobCardItem";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface JobListProps {
  initialJobs: JobSelect[];
  totalJobs?: number;
  statusFilter?: JobStatus;
  sourceFilter?: string;
  startDate?: string;
  endDate?: string;
}

type AIProvider = "claude" | "gemini" | "openai" | "gateway";

export function JobList({
  initialJobs,
  totalJobs,
  statusFilter,
  sourceFilter,
  startDate,
  endDate,
}: JobListProps) {
  const router = useRouter();
  const [jobsList, setJobsList] = useState<JobSelect[]>(initialJobs);
  const [hasMore, setHasMore] = useState<boolean>(initialJobs.length >= 20);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  const [isScoring, setIsScoring] = useState<string | null>(null);
  const [aiProvider, setAiProvider] = useState<AIProvider>("gemini");
  const [scoringError, setScoringError] = useState<string | null>(null);

  // Modal states
  const [jobToDelete, setJobToDelete] = useState<JobSelect | null>(null);
  const [missingResumeOpen, setMissingResumeOpen] = useState(false);

  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");

  // Sync initialJobs when server params change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setJobsList(initialJobs);
    setHasMore(initialJobs.length >= 20);
  }, [initialJobs]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);

    const res = await fetchMoreJobsAction(
      statusFilter,
      sourceFilter,
      jobsList.length,
      20,
      startDate,
      endDate,
    );
    setIsLoadingMore(false);

    if (res.success && res.data) {
      if (res.data.length < 20) {
        setHasMore(false);
      }
      setJobsList((prev) => [...prev, ...(res.data || [])]);
    } else {
      setHasMore(false);
    }
  }, [isLoadingMore, hasMore, statusFilter, sourceFilter, jobsList.length, startDate, endDate]);

  const filteredJobs = jobsList.filter((job) => {
    const jobDateRaw = job.postedAt || job.createdAt;
    if (!jobDateRaw) return true;
    const jobTime = new Date(jobDateRaw).getTime();

    if (startDate) {
      const startTime = new Date(startDate).getTime();
      if (!isNaN(startTime) && jobTime < startTime) return false;
    }
    if (endDate) {
      const endTime = new Date(endDate);
      endTime.setHours(23, 59, 59, 999);
      if (!isNaN(endTime.getTime()) && jobTime > endTime.getTime()) return false;
    }
    return true;
  });

  const handleStatusChange = async (jobId: string, newStatus: JobStatus) => {
    await transitionJobStatusAction(jobId, newStatus);
    window.location.reload();
  };

  const confirmDeleteJob = async () => {
    if (!jobToDelete) return;
    const targetJob = jobToDelete;
    setJobToDelete(null);

    // Optimistically update local list state
    setJobsList((prev) => prev.filter((j) => j.id !== targetJob.id));

    // Execute server deletion
    await deleteJobAction(targetJob.id);

    // Trigger 5-second Sonner Toast with Undo button
    toast.success(`Deleted "${targetJob.title}"`, {
      duration: 5000,
      description: `${targetJob.company} job removed from pipeline.`,
      action: {
        label: "Undo",
        onClick: async () => {
          setJobsList((prev) => [targetJob, ...prev]);
          await restoreJobAction(targetJob);
          toast.info(`Restored "${targetJob.title}"`);
        },
      },
    });
  };

  const handleScoreJob = async (jobId: string) => {
    setIsScoring(jobId);
    setScoringError(null);
    const res = await scoreJobAction(jobId, aiProvider);
    setIsScoring(null);

    if (!res.success) {
      const err = res.error || "Failed to score job with AI.";
      if (err.includes("NO_MASTER_RESUME") || err.toLowerCase().includes("master resume")) {
        setMissingResumeOpen(true);
      } else {
        setScoringError(err);
      }
    } else {
      window.location.reload();
    }
  };

  if (filteredJobs.length === 0) {
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

  return (
    <section aria-label="Job postings pipeline" className="space-y-6">
      {scoringError && (
        <div
          role="alert"
          aria-live="polite"
          className="p-4 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-xs font-semibold rounded-2xl flex justify-between items-center shadow-sm"
        >
          <span>⚠️ {scoringError}</span>
          <button
            onClick={() => setScoringError(null)}
            aria-label="Dismiss scoring error message"
            className="text-rose-500 hover:text-rose-800 dark:hover:text-rose-100 text-xs font-bold cursor-pointer"
          >
            {tCommon("dismiss")}
          </button>
        </div>
      )}

      {/* Header Subbar */}
      <div className="flex justify-between items-center text-xs text-gray-500 dark:text-zinc-400 font-sans pt-2 pb-2">
        <span>
          <strong className="text-gray-900 dark:text-slate-200 font-semibold">
            {totalJobs ?? filteredJobs.length}
          </strong>{" "}
          {t("opportunitiesMatching")}
        </span>
        <span className="text-xs text-gray-400 dark:text-zinc-500 font-sans">
          Sort by: Relevance
        </span>
      </div>

      {/* Flat Job Items List */}
      <ul
        role="list"
        aria-label="Available job opportunities"
        className="divide-y divide-slate-200/70 dark:divide-zinc-800/80"
      >
        {filteredJobs.map((job) => (
          <li key={job.id}>
            <JobCardItem
              job={job}
              aiProvider={aiProvider}
              isScoring={isScoring === job.id}
              onSelect={(selectedJob) =>
                router.push(`/dashboard/jobs/${selectedJob.id}`)
              }
              onStatusChange={handleStatusChange}
              onScoreJob={handleScoreJob}
              onAiProviderChange={setAiProvider}
              onDeleteJob={() => setJobToDelete(job)}
            />
          </li>
        ))}
      </ul>

      {/* Pagination Load More Button */}
      <div className="flex justify-center pt-8 pb-4">
        {hasMore ? (
          <button
            onClick={loadMore}
            disabled={isLoadingMore}
            aria-label="Load more job postings"
            className="w-full sm:w-auto bg-white dark:bg-[#18181B] border border-slate-300 dark:border-zinc-800 hover:border-slate-400 dark:hover:border-zinc-700 text-gray-900 dark:text-slate-100 font-bold text-xs sm:text-sm px-8 py-3.5 rounded-2xl shadow-xs transition duration-200 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoadingMore ? (
              <>
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                <span>{t("loadingMore")}</span>
              </>
            ) : (
              t("loadMore")
            )}
          </button>
        ) : jobsList.length >= 20 ? (
          <p className="text-xs text-gray-400 dark:text-slate-500 font-mono">
            {t("allLoaded")}
          </p>
        ) : null}
      </div>

      {/* Delete Job Confirmation Modal */}
      <Dialog
        open={Boolean(jobToDelete)}
        onOpenChange={(open) => {
          if (!open) setJobToDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#121215] border border-slate-300 dark:border-zinc-800 rounded-3xl p-6 space-y-4">
          <DialogHeader>
            <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center text-lg mb-1">
              🗑️
            </div>
            <DialogTitle className="text-base font-bold text-gray-900 dark:text-slate-100">
              {t("deleteJobModalTitle")}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
              {t("deleteJobModalDescription")}
              {jobToDelete && (
                <span className="block font-semibold text-gray-800 dark:text-zinc-200 mt-2">
                  &ldquo;{jobToDelete.title}&rdquo; at {jobToDelete.company}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setJobToDelete(null)}
              className="text-xs font-bold rounded-xl cursor-pointer"
            >
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteJob}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              {t("deleteJobConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Missing Master Resume Modal */}
      <Dialog
        open={missingResumeOpen}
        onOpenChange={setMissingResumeOpen}
      >
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#121215] border border-slate-300 dark:border-zinc-800 rounded-3xl p-6 space-y-4">
          <DialogHeader>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg mb-1">
              📄
            </div>
            <DialogTitle className="text-base font-bold text-gray-900 dark:text-slate-100">
              {t("missingResumeTitle")}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
              {t("missingResumeDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setMissingResumeOpen(false)}
              className="text-xs font-bold rounded-xl cursor-pointer"
            >
              {tCommon("cancel")}
            </Button>
            <Button
              onClick={() => {
                setMissingResumeOpen(false);
                router.push("/dashboard/profile");
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              {t("goToProfile")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
