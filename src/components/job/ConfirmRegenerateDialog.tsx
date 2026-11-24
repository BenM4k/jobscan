"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmRegenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  costLabel?: string;
  onConfirm: () => void;
}

/** Confirms before overwriting existing AI results (with optional credit cost). */
export function ConfirmRegenerateDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  costLabel,
  onConfirm,
}: ConfirmRegenerateDialogProps) {
  const tCommon = useTranslations("common");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-5 space-y-4 bg-white dark:bg-[#121216] border-slate-200 dark:border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <RotateCcw className="size-4 text-blue-600 dark:text-blue-400" />
            <span>{title}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-row justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs cursor-pointer"
          >
            {tCommon("cancel")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onOpenChange(false);
              onConfirm();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer gap-1.5"
          >
            <span>{confirmLabel}</span>
            {costLabel && (
              <span className="opacity-80 text-[11px]">({costLabel})</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
