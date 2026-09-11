"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sparkles, Upload, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  promoteTailoredResumeAction,
  revertActiveResumeAction,
} from "@/actions/resume.actions";

interface TailoredResumeActionsProps {
  tailoredResumeRecordId?: string;
  defaultLabel?: string;
}

export function TailoredResumeActions({
  tailoredResumeRecordId,
  defaultLabel = "Promoted Persona",
}: TailoredResumeActionsProps) {
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [label, setLabel] = useState(defaultLabel);
  const [isPromoting, setIsPromoting] = useState(false);

  const handlePromote = async () => {
    if (!tailoredResumeRecordId) {
      toast.error(
        "Please generate or save the tailored resume before promoting.",
      );
      return;
    }

    try {
      setIsPromoting(true);
      const res = await promoteTailoredResumeAction(
        tailoredResumeRecordId,
        label,
      );

      if (!res.success || !res.data) {
        toast.error(res.error || "Failed to promote resume");
        return;
      }

      const previousActiveId = res.previousActiveId;
      setPromoteOpen(false);

      if (previousActiveId) {
        toast.success(`Promoted "${res.data.label}" to active master resume`, {
          action: {
            label: "Undo",
            onClick: async () => {
              const undoRes = await revertActiveResumeAction(previousActiveId);
              if (undoRes.success) {
                toast.success("Active persona reverted");
              } else {
                toast.error(undoRes.error || "Failed to revert active persona");
              }
            },
          },
          duration: 8000,
        });
      } else {
        toast.success(`Promoted "${res.data.label}" to active master resume`);
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while promoting resume");
    } finally {
      setIsPromoting(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 border-t border-border/40 font-sans">
        {/* Promotion Action */}
        <button
          type="button"
          onClick={() => setPromoteOpen(true)}
          className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors inline-flex items-center gap-1.5 p-0 bg-transparent border-0 cursor-pointer"
        >
          <Sparkles className="size-3.5 shrink-0" />
          <span>Make this my master resume</span>
        </button>

        <span className="text-muted-foreground/40 text-xs hidden sm:inline">
          •
        </span>

        {/* Link to /resumes */}
        <Link
          href="/dashboard/resumes"
          className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
        >
          <Upload className="size-3.5 shrink-0" />
          <span>Upload a different resume instead</span>
          <ArrowRight className="size-3" />
        </Link>
      </div>

      {/* Promotion Label Modal */}
      <Dialog open={promoteOpen} onOpenChange={setPromoteOpen}>
        <DialogContent className="sm:max-w-md p-5 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span>Promote to Master Resume Persona</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
              This tailored resume will be saved as a new active persona. You
              can switch between personas anytime on your resumes page or before
              scoring jobs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-1">
            <label
              htmlFor="persona-label"
              className="text-xs font-medium text-foreground block"
            >
              Persona Label
            </label>
            <input
              id="persona-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Senior Backend Engineer"
              maxLength={60}
              className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <DialogFooter className="flex flex-row justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPromoteOpen(false)}
              disabled={isPromoting}
              className="text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handlePromote}
              disabled={isPromoting || !label.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
            >
              {isPromoting ? "Promoting..." : "Promote & Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
