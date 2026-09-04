"use client";

import React from "react";
import { JobSelect } from "@/dal/jobs.dal";
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

interface DeleteJobModalProps {
  job: JobSelect | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteJobModal({
  job,
  onClose,
  onConfirm,
}: DeleteJobModalProps) {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");

  return (
    <Dialog
      open={Boolean(job)}
      onOpenChange={(open) => {
        if (!open) onClose();
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
            {job && (
              <span className="block font-semibold text-gray-800 dark:text-zinc-200 mt-2">
                &ldquo;{job.title}&rdquo; at {job.company}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-row justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="text-xs font-bold rounded-xl cursor-pointer"
          >
            {tCommon("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            {t("deleteJobConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
