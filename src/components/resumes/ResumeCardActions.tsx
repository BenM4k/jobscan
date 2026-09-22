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
import { Trash2, Eye, Loader2, Check } from "lucide-react";
import { ResumeViewerModal } from "./ResumeViewerModal";
import {
  setActiveResumeAction,
  deleteMasterResumeAction,
} from "@/actions/resume.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface ResumeCardActionsProps {
  resume: MasterResumeSelect;
  isOnlyResume: boolean;
}

export function ResumeCardActions({
  resume,
  isOnlyResume,
}: ResumeCardActionsProps) {
  const [viewerModalOpen, setViewerModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSettingActive, setIsSettingActive] = useState(false);

  const router = useRouter();
  const t = useTranslations("resumes");
  const tCommon = useTranslations("common");

  const handleSetActive = async (id?: string) => {
    try {
      setIsSettingActive(true);
      const res = await setActiveResumeAction(id || resume.id);
      if (!res.success) {
        toast.error(res.error || t("failedSwitchActive"));
      } else {
        toast.success(t("activeUpdated"));
        router.refresh();
      }
    } finally {
      setIsSettingActive(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const res = await deleteMasterResumeAction(resume.id);
      if (!res.success) {
        toast.error(res.error || t("failedDeletePersona"));
      } else {
        toast.success(t("deletedPersonaSuccess", { label: resume.label }));
        setDeleteOpen(false);
        router.refresh();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setViewerModalOpen(true)}
          className="text-xs h-8 gap-1.5 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
        >
          <Eye className="size-3.5" />
          <span>{t("reviewAndEdit")}</span>
        </Button>

        {!resume.isActive && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleSetActive()}
            disabled={isSettingActive}
            className="text-xs h-8 gap-1.5 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
          >
            {isSettingActive ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
            <span>{isSettingActive ? t("activating") : t("setAsActive")}</span>
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setDeleteOpen(true)}
          disabled={isOnlyResume || isDeleting}
          title={
            isOnlyResume ? t("cannotDeleteOnlyResume") : t("deletePersona")
          }
          className="text-xs h-8 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      {/* Viewer / Editor Modal */}
      <ResumeViewerModal
        open={viewerModalOpen}
        onOpenChange={setViewerModalOpen}
        resume={resume}
        onUpdated={() => {
          router.refresh();
        }}
        onSetActive={handleSetActive}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-foreground">
              {t("deleteConfirmTitle")}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-normal leading-relaxed pt-1">
              {t("deleteConfirmDescription", { label: resume.label })}
              {resume.isActive && t("deleteActiveWarning")}
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
              {tCommon("cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? t("deleting") : t("deletePersona")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
