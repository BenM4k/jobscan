"use client";

import React, { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { JobSelect } from "@/dal/jobs.dal";
import { JobStatus } from "@/services/db/schema";
import {
  transitionJobStatusAction,
  fetchMoreJobsAction,
  deleteJobAction,
  restoreJobAction,
} from "@/actions/job.actions";
import { toast } from "sonner";
import { JobCardItem } from "@/components/job/JobCardItem";
import { JobListEmptyState } from "@/components/job/JobListEmptyState";
import { JobListSubbar } from "@/components/job/JobListSubbar";
import { JobListPagination } from "@/components/job/JobListPagination";
import { DeleteJobModal } from "@/components/job/DeleteJobModal";
import posthog from "posthog-js";

export interface JobListProps {
  initialJobs: JobSelect[];
  totalJobs?: number;
  statusFilter?: JobStatus;
  sourceFilter?: string;
  startDate?: string;
  endDate?: string;
  queryFilter?: string;
}

export function JobList({
  initialJobs,
  totalJobs,
  statusFilter,
  sourceFilter,
  startDate,
  endDate,
  queryFilter,
}: JobListProps) {
  const router = useRouter();
  const [jobsList, setJobsList] = useState<JobSelect[]>(initialJobs);
  const [prevInitialJobs, setPrevInitialJobs] = useState<JobSelect[]>(initialJobs);
  const [hasMore, setHasMore] = useState<boolean>(initialJobs.length >= 20);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const pendingStatusJobsRef = useRef<Set<string>>(new Set());

  if (prevInitialJobs !== initialJobs) {
    setPrevInitialJobs(initialJobs);
    setJobsList((prev) => {
      if (initialJobs.length === 0) return [];
      if (prev.length <= initialJobs.length) return initialJobs;
      const initialIds = new Set(initialJobs.map((j) => j.id));
      return [...initialJobs, ...prev.filter((j) => !initialIds.has(j.id))];
    });
    setHasMore(initialJobs.length >= 20);
  }

  const [jobToDelete, setJobToDelete] = useState<JobSelect | null>(null);

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
      queryFilter,
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
  }, [
    isLoadingMore,
    hasMore,
    statusFilter,
    sourceFilter,
    jobsList.length,
    startDate,
    endDate,
    queryFilter,
  ]);

  const handleStatusChange = async (jobId: string, newStatus: JobStatus) => {
    if (pendingStatusJobsRef.current.has(jobId)) {
      return;
    }

    const previousJob = jobsList.find((j) => j.id === jobId);
    if (!previousJob || previousJob.status === newStatus) {
      return;
    }

    pendingStatusJobsRef.current.add(jobId);
    setJobsList((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, status: newStatus } : j)),
    );

    try {
      const res = await transitionJobStatusAction(jobId, newStatus);
      if (res.success) {
        posthog.capture("job_status_updated", { status: newStatus, location: "list" });
        toast.success(`Status updated to ${newStatus}`);
        router.refresh();
      } else {
        setJobsList((prev) =>
          prev.map((j) =>
            j.id === jobId ? { ...j, status: previousJob.status } : j,
          ),
        );
        toast.error(res.error || "Failed to update status");
      }
    } catch {
      setJobsList((prev) =>
        prev.map((j) =>
          j.id === jobId ? { ...j, status: previousJob.status } : j,
        ),
      );
      toast.error("Failed to update status");
    } finally {
      pendingStatusJobsRef.current.delete(jobId);
    }
  };

  const confirmDeleteJob = async () => {
    if (!jobToDelete) return;
    const targetJob = jobToDelete;
    const targetIndex = jobsList.findIndex((j) => j.id === targetJob.id);
    setJobToDelete(null);

    setJobsList((prev) => prev.filter((j) => j.id !== targetJob.id));

    const deleteResult = await deleteJobAction(targetJob.id);
    if (!deleteResult.success) {
      setJobsList((prev) => {
        if (prev.some((j) => j.id === targetJob.id)) return prev;
        const next = [...prev];
        next.splice(Math.max(0, targetIndex), 0, targetJob);
        return next;
      });
      toast.error(deleteResult.error || `Failed to remove "${targetJob.title}"`);
      return;
    }

    posthog.capture("job_deleted", { location: "list" });
    router.refresh();

    toast.success(`Deleted "${targetJob.title}"`, {
      duration: 5000,
      description: `${targetJob.company} job removed from pipeline.`,
      action: {
        label: "Undo",
        onClick: async () => {
          setJobsList((prev) => {
            if (prev.some((j) => j.id === targetJob.id)) return prev;
            const next = [...prev];
            next.splice(Math.max(0, targetIndex), 0, targetJob);
            return next;
          });
          const restoreResult = await restoreJobAction(targetJob);
          if (restoreResult.success) {
            posthog.capture("job_restored", { location: "list" });
            toast.info(`Restored "${targetJob.title}"`);
            router.refresh();
          } else {
            setJobsList((prev) => prev.filter((j) => j.id !== targetJob.id));
            toast.error(
              restoreResult.error || `Failed to restore "${targetJob.title}"`,
            );
          }
        },
      },
    });
  };

  if (jobsList.length === 0) {
    return <JobListEmptyState />;
  }

  return (
    <section aria-label="Job postings pipeline" className="space-y-6">
      <JobListSubbar totalCount={totalJobs ?? jobsList.length} />

      <ul
        role="list"
        aria-label="Available job opportunities"
        className="space-y-4"
      >
        {jobsList.map((job) => (
          <li
            key={job.id}
            className="p-5 sm:p-6 rounded-2xl bg-slate-100/60 dark:bg-zinc-900/40 hover:bg-slate-100/90 dark:hover:bg-zinc-900/60 transition-colors"
          >
            <JobCardItem
              job={job}
              onStatusChange={handleStatusChange}
              onDeleteJob={() => setJobToDelete(job)}
            />
          </li>
        ))}
      </ul>

      <JobListPagination
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={loadMore}
        currentCount={jobsList.length}
      />

      <DeleteJobModal
        job={jobToDelete}
        onClose={() => setJobToDelete(null)}
        onConfirm={confirmDeleteJob}
      />
    </section>
  );
}
