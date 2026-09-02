"use client";

import React, { useState } from "react";
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
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import posthog from "posthog-js";

interface JobDetailViewProps {
  initialJob: JobSelect;
}

export function JobDetailView({ initialJob }: JobDetailViewProps) {
  const [job, setJob] = useState<JobSelect>(initialJob);
  const [isScoring, setIsScoring] = useState(false);
  const [scoringError, setScoringError] = useState<string | null>(null);
  const [missingResumeOpen, setMissingResumeOpen] = useState(false);
  const router = useRouter();
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");

  const handleStatusChange = async (newStatus: JobStatus) => {
    setJob((prev) => ({ ...prev, status: newStatus }));
    const res = await transitionJobStatusAction(job.id, newStatus);
    if (!res.success) {
      toast.error(res.error || "Failed to update status");
      setJob((prev) => ({ ...prev, status: job.status }));
    } else {
      posthog.capture("job_status_updated", { status: newStatus, location: "detail" });
      toast.success(`Status updated to "${newStatus.toUpperCase()}"`);
    }
  };

  const handleScoreJob = async () => {
    try {
      setIsScoring(true);
      setScoringError(null);

      const res = await fetch(`/api/jobs/${job.id}/score`, {
        method: "POST",
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
      posthog.capture("job_scored", { location: "detail" });
      setJob(data);
      toast.success("Job scored against Master Resume successfully!");
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
    <div className="space-y-10 sm:space-y-12">
      <JobDetailHeader job={job} onStatusChange={handleStatusChange} />

      <JobScoreSection
        job={job}
        isScoring={isScoring}
        scoringError={scoringError}
        onScoreJob={handleScoreJob}
      />

      <JobTailoredResumeSection job={job} onJobUpdated={handleJobUpdated} />

      <JobCoverLetterSection job={job} onJobUpdated={handleJobUpdated} />

      <JobDescriptionSection description={job.description} />

      {/* Missing Master Resume Modal */}
      <Dialog open={missingResumeOpen} onOpenChange={setMissingResumeOpen}>
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
    </div>
  );
}
