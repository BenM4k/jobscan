"use client";

import React, { useState, useRef } from "react";
import { JobSelect } from "@/dal/jobs.dal";
import { JobStatus } from "@/services/db/schema";
import { transitionJobStatusAction } from "@/actions/job.actions";
import { JobDetailHeader } from "./JobDetailHeader";
import { JobScoreSection } from "./JobScoreSection";
import { JobTailoredResumeSection } from "./JobTailoredResumeSection";
import { JobCoverLetterSection } from "./JobCoverLetterSection";
import { JobDescriptionSection } from "./JobDescriptionSection";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { FileText, Info } from "lucide-react";
import posthog from "posthog-js";

interface JobDetailViewProps {
  initialJob: JobSelect;
}

export function JobDetailView({ initialJob }: JobDetailViewProps) {
  const [job, setJob] = useState<JobSelect>(initialJob);
  const [isScoring, setIsScoring] = useState(false);
  const [scoringError, setScoringError] = useState<string | null>(null);
  const [missingResumeOpen, setMissingResumeOpen] = useState(false);
  const pendingScoreIdempotencyKeyRef = useRef<string | null>(null);
  const router = useRouter();

  const handleStatusChange = async (newStatus: JobStatus) => {
    setJob((prev) => ({ ...prev, status: newStatus }));
    const res = await transitionJobStatusAction(job.id, newStatus);
    if (!res.success) {
      toast.error(res.error || "Failed to update status");
      setJob((prev) => ({ ...prev, status: job.status }));
    } else {
      posthog.capture("job_status_updated", { status: newStatus, location: "detail" });
      toast.success(`Status updated to ${newStatus}`);
    }
  };

  const handleScoreJob = async () => {
    try {
      setIsScoring(true);
      setScoringError(null);
      if (!pendingScoreIdempotencyKeyRef.current) {
        pendingScoreIdempotencyKeyRef.current = crypto.randomUUID();
      }
      const idempotencyKey = pendingScoreIdempotencyKeyRef.current;

      const res = await fetch(`/api/jobs/${job.id}/score`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({ idempotencyKey }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        const msg = errJson.error || "Failed to score job";
        if (msg.toLowerCase().includes("resume")) {
          setMissingResumeOpen(true);
          return;
        }
        throw new Error(msg);
      }

      const { data } = await res.json();
      pendingScoreIdempotencyKeyRef.current = null;
      posthog.capture("job_scored", { location: "detail" });
      setJob(data);
      toast.success("Job scored");
      router.refresh();
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Scoring failed";
      setScoringError(msg);
      toast.error(msg);
    } finally {
      setIsScoring(false);
    }
  };

  const handleJobUpdated = (updated: JobSelect) => {
    setJob(updated);
  };

  return (
    <div className="divide-y divide-border/40">
      <JobDetailHeader job={job} onStatusChange={handleStatusChange} />

      <JobScoreSection
        job={job}
        isScoring={isScoring}
        scoringError={scoringError}
        onScoreJob={handleScoreJob}
      />

      <JobTailoredResumeSection job={job} onJobUpdated={handleJobUpdated} />

      <JobCoverLetterSection job={job} onJobUpdated={handleJobUpdated} />

      {/* AI Toolkit Area Disclaimer (single instance) */}
      <div className="py-3.5 flex items-center gap-2 text-sm text-muted-foreground font-normal font-sans">
        <Info className="size-[18px] text-muted-foreground/70 shrink-0" />
        <span>AI-generated content — review before submitting to employers</span>
      </div>

      <JobDescriptionSection description={job.description} />

      {/* Missing Master Resume Modal */}
      <Dialog open={missingResumeOpen} onOpenChange={setMissingResumeOpen}>
        <DialogContent className="sm:max-w-md p-6 space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <FileText className="size-[18px] text-muted-foreground shrink-0" />
              <DialogTitle className="text-sm font-medium text-foreground">
                Master resume required
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground font-normal leading-relaxed pt-1">
              Upload or configure your master resume in profile settings before evaluating and scoring jobs.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row items-center justify-end gap-3 pt-3 border-t border-border/40">
            <button
              type="button"
              onClick={() => setMissingResumeOpen(false)}
              className="text-xs font-normal text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-0 bg-transparent border-0"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setMissingResumeOpen(false);
                router.push("/dashboard/profile");
              }}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer p-0 bg-transparent border-0"
            >
              Set up resume
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
