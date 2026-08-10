"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { JobCardSkeleton } from "@/components/JobCardSkeleton";
import { JobCardItem } from "@/components/job/JobCardItem";
import { JobDetailModal } from "@/components/job/JobDetailModal";

interface JobListProps {
  initialJobs: JobSelect[];
  totalJobs?: number;
  statusFilter?: JobStatus;
  sourceFilter?: string;
  startDate?: string;
  endDate?: string;
}

type AIProvider = "claude" | "gemini" | "openai";

export function JobList({
  initialJobs,
  totalJobs,
  statusFilter,
  sourceFilter,
  startDate,
  endDate,
}: JobListProps) {
  const [jobsList, setJobsList] = useState<JobSelect[]>(initialJobs);
  const [hasMore, setHasMore] = useState<boolean>(initialJobs.length >= 20);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  const [selectedJob, setSelectedJob] = useState<JobSelect | null>(null);
  const [isScoring, setIsScoring] = useState<string | null>(null);
  const [aiProvider, setAiProvider] = useState<AIProvider>("gemini");

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

  const handleDeleteJob = async (jobId: string) => {
    const targetJob = jobsList.find((j) => j.id === jobId);
    if (!targetJob) return;

    // Optimistically update local list state
    setJobsList((prev) => prev.filter((j) => j.id !== jobId));

    // Execute server deletion
    await deleteJobAction(jobId);

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

  const [scoringError, setScoringError] = useState<string | null>(null);

  const handleScoreJob = async (jobId: string) => {
    setIsScoring(jobId);
    setScoringError(null);
    const res = await scoreJobAction(jobId, aiProvider);
    setIsScoring(null);

    if (!res.success) {
      setScoringError(res.error || "Failed to score job with AI.");
    } else {
      window.location.reload();
    }
  };

  if (filteredJobs.length === 0) {
    return (
      <div className="text-center py-16 px-6 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-xl shadow-gray-200/40 dark:shadow-none transition-all duration-300">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center mx-auto mb-4 text-2xl font-black shadow-lg shadow-blue-500/25">
          ✦
        </div>
        <h3 className="text-lg font-black text-gray-900 dark:text-slate-100">
          No matching jobs in pipeline
        </h3>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
          No job postings match your active date range, status, or source filters. Click
          below to crawl Congolese sources or search global boards.
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
            className="text-rose-500 hover:text-rose-800 dark:hover:text-rose-100 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header Subbar */}
      <div className="flex justify-between items-center text-xs text-gray-500 dark:text-zinc-400 font-sans border-t border-gray-200/60 dark:border-zinc-800/80 pt-4 pb-1">
        <span>
          <strong className="text-gray-900 dark:text-slate-200 font-semibold">
            {totalJobs ?? filteredJobs.length}
          </strong>{" "}
          opportunities matching filters
        </span>
        <span className="text-[11px] text-gray-400 dark:text-zinc-500 font-mono">
          Sorted by most recent
        </span>
      </div>

      {/* Stacked Job Cards List */}
      <ul
        role="list"
        aria-label="Available job opportunities"
        className="flex flex-col space-y-6 sm:space-y-7"
      >
        {filteredJobs.map((job) => (
          <li key={job.id}>
            <JobCardItem
              job={job}
              aiProvider={aiProvider}
              isScoring={isScoring === job.id}
              onSelect={setSelectedJob}
              onStatusChange={handleStatusChange}
              onScoreJob={handleScoreJob}
              onAiProviderChange={setAiProvider}
              onDeleteJob={handleDeleteJob}
            />
          </li>
        ))}

        {isLoadingMore && (
          <div
            aria-busy="true"
            aria-label="Loading more jobs"
            className="flex flex-col space-y-6"
          >
            <JobCardSkeleton />
            <JobCardSkeleton />
          </div>
        )}
      </ul>

      {/* Manual Load More Button & Indicator */}
      <div className="py-6 text-center">
        {hasMore ? (
          <button
            onClick={loadMore}
            disabled={isLoadingMore}
            className="bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-800 dark:text-slate-200 border border-gray-200 dark:border-slate-800 text-xs font-bold px-6 py-2.5 rounded-xl transition shadow-sm disabled:opacity-50 inline-flex items-center gap-2"
          >
            {isLoadingMore ? (
              <>
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                Loading Jobs...
              </>
            ) : (
              "Load More Jobs (+20)"
            )}
          </button>
        ) : jobsList.length >= 20 ? (
          <p className="text-xs text-gray-400 dark:text-slate-500 font-mono">
            ✓ All pipeline jobs loaded
          </p>
        ) : null}
      </div>

      {/* Detailed Job Inspection Modal */}
      <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />
    </section>
  );
}
