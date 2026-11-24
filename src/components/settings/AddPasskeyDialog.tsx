"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Fingerprint, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AddPasskeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName: string;
  initialName?: string;
  reauthReady?: boolean;
  isSubmitting: boolean;
  onConfirm: (name: string) => Promise<boolean>;
}

/** Accessible shadcn Dialog replacing browser `window.prompt()` for passkey naming. */
export function AddPasskeyDialog({
  open,
  onOpenChange,
  defaultName,
  initialName,
  reauthReady = false,
  isSubmitting,
  onConfirm,
}: AddPasskeyDialogProps) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const [name, setName] = useState(initialName || defaultName);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isSubmitting) return;
    if (nextOpen) {
      setName(initialName || defaultName);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const resolved = name.trim() || defaultName;
    const completed = await onConfirm(resolved);
    if (completed) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-[#121216] border-slate-200 dark:border-zinc-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-zinc-100">
            <Fingerprint className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>{t("passkeyDialogTitle")}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500 dark:text-zinc-400">
            {t("passkeyDialogDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {reauthReady && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/30 px-3 py-2.5 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{t("passkeyReauthReady")}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="passkey-device-name"
              className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider"
            >
              {t("passkeyNameLabel")}
            </label>
            <input
              id="passkey-device-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={defaultName}
              maxLength={80}
              autoFocus
              disabled={isSubmitting}
              className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 px-3 py-2 text-xs text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              {t("registerPasskey")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
