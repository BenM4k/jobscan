"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Loader2, Phone, Sparkles } from "lucide-react";

interface SubscriptionActionAreaProps {
  isActive: boolean;
  isCanceled: boolean;
  formattedEnd: string;
  subStatus: "idle" | "pending" | "confirmed" | "failed";
  phoneNumber: string;
  onPhoneNumberChange: (value: string) => void;
  isInitiating: boolean;
  isCanceling: boolean;
  priceMonthly: string;
  onSubscribe: () => void;
  onCancel: () => void;
}

/** Renders the Pro subscription status actions, mobile-money input, or cancel button. */
export function SubscriptionActionArea({
  isActive,
  isCanceled,
  formattedEnd,
  subStatus,
  phoneNumber,
  onPhoneNumberChange,
  isInitiating,
  isCanceling,
  priceMonthly,
  onSubscribe,
  onCancel,
}: SubscriptionActionAreaProps) {
  const t = useTranslations("billing");
  const canSubscribe = !isInitiating && Boolean(phoneNumber.trim());

  if (isActive) {
    return (
      <div className="pt-4 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs sm:text-sm">
        <span className="text-muted-foreground">
          {t("subscriptionActive", { date: formattedEnd })}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isCanceling}
          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs w-fit"
        >
          {isCanceling ? t("canceling") : t("cancelSubscription")}
        </Button>
      </div>
    );
  }

  if (isCanceled) {
    return (
      <div className="pt-4 border-t border-border/60 text-xs sm:text-sm text-amber-600 dark:text-amber-400">
        {t("subscriptionCanceled", { date: formattedEnd })}
      </div>
    );
  }

  if (subStatus === "pending") {
    return (
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center gap-3 text-xs sm:text-sm max-w-xl">
        <Loader2 className="size-4.5 animate-spin shrink-0" />
        <span>{t("processingPayment")}</span>
      </div>
    );
  }

  return (
    <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 max-w-xl">
      <div className="relative flex-1">
        <label htmlFor="subscription-phone-input" className="sr-only">
          {t("phoneNumberLabel")}
        </label>
        <Phone className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          id="subscription-phone-input"
          type="tel"
          placeholder={t("phoneNumberPlaceholder")}
          value={phoneNumber}
          onChange={(e) => onPhoneNumberChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (canSubscribe) {
                onSubscribe();
              }
            }
          }}
          className="w-full pl-10 pr-3.5 h-10 rounded-lg border border-input bg-transparent text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
        />
      </div>
      <Button
        onClick={onSubscribe}
        disabled={!canSubscribe}
        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold h-10 px-6 rounded-lg shrink-0 shadow-xs transition-colors"
      >
        {isInitiating ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Sparkles className="size-4" />
        )}
        <span>{t("subscribePro", { price: priceMonthly })}</span>
      </Button>
    </div>
  );
}
