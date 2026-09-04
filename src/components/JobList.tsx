"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  const [jobsList, setJobsList] = useState<JobSelect[]>(initialJobs);
  const [hasMore, setHasMore] = useState<boolean>(initialJobs.length >= 20);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  const [jobToDelete, setJobToDelete] = useState<JobSelect | null>(null);

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
    const res = await transitionJobStatusAction(jobId, newStatus);
    if (res.success) {
      posthog.capture("job_status_updated", { status: newStatus, location: "list" });
    }
    window.location.reload();
  };

  const confirmDeleteJob = async () => {
    if (!jobToDelete) return;
    const targetJob = jobToDelete;
    setJobToDelete(null);

    setJobsList((prev) => prev.filter((j) => j.id !== targetJob.id));

    const deleteResult = await deleteJobAction(targetJob.id);
    if (deleteResult.success) {
      posthog.capture("job_deleted", { location: "list" });
    }

    toast.success(`Deleted "${targetJob.title}"`, {
      duration: 5000,
      description: `${targetJob.company} job removed from pipeline.`,
      action: {
        label: "Undo",
        onClick: async () => {
          setJobsList((prev) => [targetJob, ...prev]);
          const restoreResult = await restoreJobAction(targetJob);
          if (restoreResult.success) {
            posthog.capture("job_restored", { location: "list" });
          }
          toast.info(`Restored "${targetJob.title}"`);
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
        className="divide-y divide-slate-200/70 dark:divide-zinc-800/80"
      >
        {jobsList.map((job) => (
          <li key={job.id}>
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
