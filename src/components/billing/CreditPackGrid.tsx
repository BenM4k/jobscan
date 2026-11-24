"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { CreditPackSelect } from "@/dal/billing.dal";
import { Loader2, CheckCircle2, Phone } from "lucide-react";

interface CreditPackGridProps {
  packs: CreditPackSelect[];
  selectedPackId: string;
  onSelectPack: (packId: string) => void;
  phoneNumber: string;
  onPhoneNumberChange: (value: string) => void;
  purchaseStatus: "idle" | "pending" | "timed_out" | "confirmed" | "failed";
  pendingAttempt: {
    providerReference: string;
    packId: string;
    creditAmount: number;
  } | null;
  isInitiating: boolean;
  onPurchase: () => void;
  onResumeStatusCheck: () => void;
}

/** Renders the selectable credit packs grid, mobile-money phone input, and purchase status. */
export function CreditPackGrid({
  packs,
  selectedPackId,
  onSelectPack,
  phoneNumber,
  onPhoneNumberChange,
  purchaseStatus,
  pendingAttempt,
  isInitiating,
  onPurchase,
  onResumeStatusCheck,
}: CreditPackGridProps) {
  const t = useTranslations("billing");
  const effectiveSelectedId = pendingAttempt?.packId ?? selectedPackId;
  const canSubmitPurchase =
    !isInitiating &&
    Boolean(phoneNumber.trim()) &&
    Boolean(selectedPackId);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {packs.map((pack) => {
          const isSelected = effectiveSelectedId === pack.id;
          const priceFormatted = (pack.priceCents / 100).toFixed(2);
          return (
            <button
              key={pack.id}
              type="button"
              onClick={() => onSelectPack(pack.id)}
              disabled={purchaseStatus === "pending" || pendingAttempt !== null}
              aria-pressed={isSelected}
              className={`p-5 rounded-xl border text-left transition-all relative ${
                isSelected
                  ? "border-blue-600 bg-blue-50/40 dark:bg-blue-950/20 ring-1 ring-blue-500/30"
                  : "border-border/60 hover:border-border bg-card/40 hover:bg-muted/20"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {pack.name}
                </span>
                {isSelected && <span className="size-2 rounded-full bg-blue-600" />}
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold mt-1.5 text-foreground tracking-tight">
                ${priceFormatted}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {pack.creditAmount} {t("credits").toLowerCase()}
              </div>
            </button>
          );
        })}
      </div>

      <div className="space-y-4 pt-2 max-w-xl">
        <div className="space-y-1.5">
          <label
            htmlFor="credit-pack-phone"
            className="text-xs sm:text-sm font-medium text-foreground flex items-center gap-1.5"
          >
            <Phone className="size-3.5 text-muted-foreground" />
            <span>{t("phoneNumberLabel")}</span>
          </label>
          <input
            id="credit-pack-phone"
            type="tel"
            placeholder={t("phoneNumberPlaceholder")}
            value={phoneNumber}
            onChange={(e) => onPhoneNumberChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (canSubmitPurchase) {
                  onPurchase();
                }
              }
            }}
            disabled={purchaseStatus === "pending" || pendingAttempt !== null}
            className="w-full px-3.5 h-10 rounded-lg border border-input bg-transparent text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
          />
        </div>

        {purchaseStatus === "pending" ? (
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center gap-3 text-xs sm:text-sm">
            <Loader2 className="size-4.5 animate-spin shrink-0" />
            <span>{t("processingPayment")}</span>
          </div>
        ) : purchaseStatus === "timed_out" && pendingAttempt ? (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
            <span>{t("paymentTimedOut")}</span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onResumeStatusCheck}
              className="shrink-0"
            >
              {t("checkPaymentStatus")}
            </Button>
          </div>
        ) : purchaseStatus === "confirmed" ? (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-3 text-xs sm:text-sm">
            <CheckCircle2 className="size-4.5 shrink-0" />
            <span>{t("purchaseConfirmed", { amount: "" })}</span>
          </div>
        ) : (
          <Button
            variant="secondary"
            onClick={onPurchase}
            disabled={!canSubmitPurchase}
            className="h-10 px-6 rounded-lg text-sm font-medium border border-border/80 bg-secondary/80 hover:bg-secondary text-secondary-foreground transition-colors shadow-2xs"
          >
            {isInitiating ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                <span>{t("initiating")}</span>
              </span>
            ) : (
              t("payWithMobileMoney")
            )}
          </Button>
        )}
      </div>
    </>
  );
}
