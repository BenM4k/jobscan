"use client";

import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Coins, ArrowRight } from "lucide-react";

interface InsufficientCreditsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requiredCost?: number;
  currentBalance?: number;
}

/** Explains a credit shortfall and directs the user to available purchase options. */
export function InsufficientCreditsDialog({
  open,
  onOpenChange,
  requiredCost = 5,
  currentBalance = 0,
}: InsufficientCreditsDialogProps) {
  const t = useTranslations("billing");
  const shortfall = Math.max(0, requiredCost - currentBalance);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="gap-2">
          <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-1">
            <Coins className="size-5" />
          </div>
          <DialogTitle>{t("insufficientCreditsTitle")}</DialogTitle>
          <DialogDescription>
            {t("insufficientCreditsDesc", {
              required: requiredCost,
              balance: currentBalance,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="my-2 p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 text-xs space-y-1.5">
          <div className="flex justify-between text-muted-foreground">
            <span>{t("requiredCost")}</span>
            <span className="font-semibold text-foreground">
              {requiredCost} {t("credits").toLowerCase()}
            </span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>{t("currentBalance")}</span>
            <span className="font-semibold text-foreground">
              {currentBalance} {t("credits").toLowerCase()}
            </span>
          </div>
          <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-1.5 text-amber-600 dark:text-amber-400 font-medium">
            <span>{t("shortfall")}</span>
            <span>
              {shortfall} {t("credits").toLowerCase()}
            </span>
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-end">
          <DialogClose render={<Button variant="outline" className="w-full sm:w-auto" />}>
            {t("dismiss")}
          </DialogClose>
          <Button
            render={<Link href="/dashboard/billing" />}
            nativeButton={false}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
          >
            <span>{t("topUp")}</span>
            <ArrowRight className="size-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
