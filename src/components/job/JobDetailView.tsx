"use client";

import React, { useState } from "react";
import { JobSelect } from "@/dal/jobs.dal";
import { JobStatus } from "@/services/db/schema";
import { transitionJobStatusAction } from "@/actions/job.actions";
import { MasterResumeSelect } from "@/services/db/schema";
import { JobDetailHeader } from "./JobDetailHeader";
import { JobScoreSection } from "./JobScoreSection";
import { JobTailoredResumeSection } from "./JobTailoredResumeSection";
import { JobCoverLetterSection } from "./JobCoverLetterSection";
import { JobDescriptionSection } from "./JobDescriptionSection";
import { useJobScoring } from "./useJobScoring";
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
import { useTranslations } from "next-intl";
import { CreateResumeModal } from "@/components/resumes/CreateResumeModal";

interface JobDetailViewProps {
  initialJob: JobSelect;
  initialResumes?: MasterResumeSelect[];
}

export function JobDetailView({
  initialJob,
  initialResumes = [],
}: JobDetailViewProps) {
  const tCommon = useTranslations("common");
  const tDash = useTranslations("dashboard");
  const tJob = useTranslations("jobDetail");
  const [job, setJob] = useState<JobSelect>(initialJob);
  const [resumes, setResumes] = useState<MasterResumeSelect[]>(initialResumes);
  const initialActive = initialResumes.find((r) => r.isActive);
  const [selectedResumeId, setSelectedResumeId] = useState<string | undefined>(
    initialActive?.id || initialResumes[0]?.id
  );
  const [createResumeOpen, setCreateResumeOpen] = useState(false);
  const router = useRouter();

  const scoring = useJobScoring({
    job,
    selectedResumeId,
    onJobUpdated: setJob,
  });

  const handleResumeCreated = (newResume: MasterResumeSelect) => {
    setResumes((prev) => [newResume, ...prev]);
    setSelectedResumeId(newResume.id);
    scoring.handleScoreJob(newResume.id);
  };

  const handleSelectResume = (id: string) => {
    setSelectedResumeId(id);
    if (job.fitScore !== null && job.fitScore !== undefined) {
      scoring.handleScoreJob(id);
    }
  };
  const handleStatusChange = async (newStatus: JobStatus) => {
    setJob((prev) => ({ ...prev, status: newStatus }));
    const res = await transitionJobStatusAction(job.id, newStatus);
    if (!res.success) {
      toast.error(res.error || "Failed to update status");
      setJob((prev) => ({ ...prev, status: job.status }));
    } else {
      posthog.capture("job_status_updated", {
        status: newStatus,
        location: "detail",
      });
      toast.success(`Status updated to ${newStatus}`);
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
        isScoring={scoring.isScoring}
        scoringError={scoring.scoringError}
        onScoreJob={() => scoring.handleScoreJob()}
        resumes={resumes}
        selectedResumeId={selectedResumeId}
        onSelectResume={handleSelectResume}
        onAddPersona={() => setCreateResumeOpen(true)}
        retryStatus={scoring.status}
        retryAttempt={scoring.attempt}
        totalAttempts={scoring.totalAttempts}
        retryCountdown={scoring.countdown}
        retryMessage={scoring.scoringMessage}
        onRetryNow={scoring.retryNow}
        onCancelRetry={scoring.cancelRetry}
      />

      <JobTailoredResumeSection
        job={job}
        onJobUpdated={handleJobUpdated}
        selectedResumeId={selectedResumeId}
      />

      <JobCoverLetterSection
        job={job}
        onJobUpdated={handleJobUpdated}
        selectedResumeId={selectedResumeId}
      />

      {/* AI Toolkit Area Disclaimer (single instance) */}
      <div className="py-3.5 flex items-center gap-2 text-sm text-muted-foreground font-normal font-sans">
        <Info className="size-4.5 text-muted-foreground/70 shrink-0" />
        <span>{tCommon("aiNotice")}</span>
      </div>

      <JobDescriptionSection description={job.description} />

      {/* Missing Master Resume Modal */}
      <Dialog open={scoring.missingResumeOpen} onOpenChange={scoring.setMissingResumeOpen}>
        <DialogContent className="sm:max-w-md p-6 space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <FileText className="size-4.5 text-muted-foreground shrink-0" />
              <DialogTitle className="text-sm font-medium text-foreground">
                {tDash("missingResumeTitle")}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground font-normal leading-relaxed pt-1">
              {tDash("missingResumeDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row items-center justify-end gap-3 pt-3 border-t border-border/40">
            <button
              type="button"
              onClick={() => scoring.setMissingResumeOpen(false)}
              className="text-xs font-normal text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-0 bg-transparent border-0"
            >
              {tCommon("cancel")}
            </button>
            <button
              type="button"
              onClick={() => {
                scoring.setMissingResumeOpen(false);
                router.push("/dashboard/profile");
              }}
              className="text-xs font-normal text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-0 bg-transparent border-0"
            >
              {tDash("goToProfile")}
            </button>
            <button
              type="button"
              onClick={() => {
                scoring.setMissingResumeOpen(false);
                setCreateResumeOpen(true);
              }}
              className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 transition-colors cursor-pointer shadow-xs"
            >
              {tJob("uploadResume")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create / Upload Resume Persona Modal */}
      <CreateResumeModal
        open={createResumeOpen}
        onOpenChange={setCreateResumeOpen}
        onCreated={handleResumeCreated}
      />
    </div>
  );
}
