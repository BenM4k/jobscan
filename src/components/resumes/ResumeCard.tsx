"use client";

import React, { useState } from "react";
import { MasterResumeSelect } from "@/services/db/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Check, CheckCircle2, FileText, Trash2, Globe, Sparkles, History } from "lucide-react";

interface ResumeCardProps {
  resume: MasterResumeSelect;
  isOnlyResume: boolean;
  onSetActive: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function ResumeCard({
  resume,
  isOnlyResume,
  onSetActive,
  onDelete,
}: ResumeCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSettingActive, setIsSettingActive] = useState(false);

  const handleSetActive = async () => {
    try {
      setIsSettingActive(true);
      await onSetActive(resume.id);
    } finally {
      setIsSettingActive(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onDelete(resume.id);
      setDeleteOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const isUploaded = resume.source === "uploaded";
  const updatedDate = resume.updatedAt
    ? new Date(resume.updatedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div
      className={`rounded-xl border transition-all p-5 bg-card text-card-foreground space-y-4 ${
        resume.isActive
          ? "border-blue-500/50 shadow-xs ring-1 ring-blue-500/20 dark:border-blue-500/40"
          : "border-border/60 hover:border-border"
      }`}
    >
      {/* Top Header: Label, Badges & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 font-sans">
              <FileText className="size-4 text-muted-foreground shrink-0" />
              <span>{resume.label}</span>
            </h3>

            {resume.isActive && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full font-sans">
                <Check className="size-3" />
                <span>Active Persona</span>
              </span>
            )}

            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
              <Globe className="size-3" />
              <span>{resume.language}</span>
            </span>

            <span className="inline-flex items-center gap-1 text-[11px] font-normal text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full font-mono">
              <History className="size-3" />
              <span>v{resume.version}</span>
            </span>

            <span
              className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full font-sans ${
                isUploaded
                  ? "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300"
                  : "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
              }`}
            >
              {!isUploaded && <Sparkles className="size-3 shrink-0" />}
              <span>{isUploaded ? "Uploaded" : "Promoted from Tailored"}</span>
            </span>
          </div>

          {updatedDate && (
            <p className="text-xs text-muted-foreground">
              Last updated on {updatedDate}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {!resume.isActive && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSetActive}
              disabled={isSettingActive}
              className="text-xs h-8 gap-1.5"
            >
              <CheckCircle2 className="size-3.5 text-blue-600 dark:text-blue-400" />
              <span>{isSettingActive ? "Activating..." : "Set as active"}</span>
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setDeleteOpen(true)}
            disabled={isOnlyResume}
            title={isOnlyResume ? "Cannot delete your only resume" : "Delete persona"}
            className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {/* Content Preview Snippet */}
      <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground font-mono leading-relaxed line-clamp-3 border border-border/40">
        {resume.content}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-foreground">
              Delete Resume Persona
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-normal leading-relaxed pt-1">
              Are you sure you want to delete <strong className="text-foreground">{resume.label}</strong>?
              {resume.isActive && " Since this is your active persona, your next most recently updated persona will automatically become active."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row items-center justify-end gap-2 pt-3 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Persona"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
