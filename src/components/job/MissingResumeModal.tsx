"use client";

import React from "react";
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

interface MissingResumeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateToProfile: () => void;
}

export function MissingResumeModal({
  open,
  onOpenChange,
  onNavigateToProfile,
}: MissingResumeModalProps) {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            onClick={() => onOpenChange(false)}
            className="text-xs font-bold rounded-xl cursor-pointer"
          >
            {tCommon("cancel")}
          </Button>
          <Button
            onClick={onNavigateToProfile}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            {t("goToProfile")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
