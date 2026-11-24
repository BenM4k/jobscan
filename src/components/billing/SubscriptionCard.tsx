"use client";

import React, { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { sanitizeExternalUrl } from "@/lib/safe-url";
import { SubscriptionActionArea } from "@/components/billing/SubscriptionActionArea";
import { useBillingStatusPolling } from "@/hooks/useBillingStatusPolling";
import type { SubscriptionPlanSelect, SubscriptionSelect } from "@/dal/billing.dal";
import {
  initiateSubscriptionAction,
  cancelSubscriptionAction,
} from "@/actions/billing.actions";
import { toast } from "sonner";
import { Crown, Check } from "lucide-react";

interface SubscriptionSectionProps {
  plan?: SubscriptionPlanSelect | null;
  subscription?: SubscriptionSelect | null;
  onSubscriptionUpdated?: (newSub?: SubscriptionSelect | null) => void;
}

/** Displays subscription plans and manages subscription purchase or cancellation. */
export function SubscriptionSection({
  plan,
  subscription,
  onSubscriptionUpdated,
}: SubscriptionSectionProps) {
  const t = useTranslations("billing");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isInitiating, setIsInitiating] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [pollingRef, setPollingRef] = useState<string | null>(null);
  const [subStatus, setSubStatus] = useState<
    "idle" | "pending" | "confirmed" | "failed"
  >("idle");

  const idempotencyKeyRef = useRef<string | null>(null);

  const isActive =
    subscription?.status === "active" &&
    new Date(subscription.currentPeriodEnd) > new Date();

  const isCanceled =
    subscription?.status === "canceled" &&
    new Date(subscription.currentPeriodEnd) > new Date();

  useBillingStatusPolling({
    pollingRef,
    enabled: subStatus === "pending",
    onConfirmed: (data) => {
      setSubStatus("confirmed");
      setPollingRef(null);
      toast.success(t("subActivated"));
      idempotencyKeyRef.current = crypto.randomUUID();
      onSubscriptionUpdated?.(data.subscription);
    },
    onFailed: () => {
      setSubStatus("failed");
      setPollingRef(null);
      toast.error(t("subFailed"));
      idempotencyKeyRef.current = crypto.randomUUID();
    },
    onTimedOut: () => {
      setSubStatus("idle");
      setPollingRef(null);
      toast.error(t("paymentTimedOut"));
    },
  });

  const handleSubscribe = async () => {
    const planId = plan?.id || "pro";
    if (!phoneNumber.trim()) {
      toast.error(t("phoneRequired"));
      return;
    }

    const idempotencyKey =
      idempotencyKeyRef.current ??
      (idempotencyKeyRef.current = crypto.randomUUID());

    try {
      setIsInitiating(true);
      const res = await initiateSubscriptionAction({
        planId,
        phoneNumber: phoneNumber.trim(),
        idempotencyKey,
      });

      if (!res.success || !res.data) {
        toast.error(res.error || t("subInitiateError"));
        setIsInitiating(false);
        return;
      }

      if (res.data.checkoutUrl) {
        const safeUrl = sanitizeExternalUrl(res.data.checkoutUrl, {
          httpsOnly: process.env.NODE_ENV === "production",
        });
        if (!safeUrl) {
          toast.error(t("subInitiateError"));
          setIsInitiating(false);
          return;
        }
        window.location.href = safeUrl;
        return;
      }

      setSubStatus("pending");
      setPollingRef(res.data.providerReference);
    } catch {
      toast.error(t("unexpectedSubError"));
    } finally {
      setIsInitiating(false);
    }
  };

  const handleCancel = async () => {
    try {
      setIsCanceling(true);
      const res = await cancelSubscriptionAction();
      if (!res.success) {
        toast.error(res.error || t("subCancelError"));
        return;
      }
      toast.success(t("subCanceled"));
      onSubscriptionUpdated?.();
    } catch {
      toast.error(t("subCancelError"));
    } finally {
      setIsCanceling(false);
    }
  };

  const priceMonthly = plan ? (plan.priceCentsMonthly / 100).toFixed(0) : "15";
  const formattedEnd = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
    : "";

  return (
    <section aria-labelledby="subscription-heading" className="space-y-8">
      {/* Header Row: Title, Badges & Price */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/60 dark:border-blue-900/40 shrink-0">
              <Crown className="size-4" />
            </div>
            <h2
              id="subscription-heading"
              className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2.5"
            >
              <span>{plan?.name || t("proPlan")}</span>
              {isActive && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {t("statusActive")}
                </span>
              )}
              {isCanceled && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {t("statusCanceled")}
                </span>
              )}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground pl-10.5 max-w-xl leading-relaxed">
            {t("subscriptionSubtitle")}
          </p>
        </div>

        <div className="sm:text-right pl-10.5 sm:pl-0">
          <div className="text-3xl font-extrabold text-foreground tracking-tight">
            ${priceMonthly}
            <span className="text-xs font-normal text-muted-foreground ml-1.5">
              {t("perMonth")}
            </span>
          </div>
        </div>
      </div>

      {/* Feature List */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2">
        {(["proFeature1", "proFeature2", "proFeature3"] as const).map((key) => (
          <div key={key} className="flex items-start gap-3 text-xs sm:text-sm text-foreground/90">
            <div className="size-4.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="size-3" />
            </div>
            <span>{t(key)}</span>
          </div>
        ))}
      </div>

      <SubscriptionActionArea
        isActive={isActive}
        isCanceled={isCanceled}
        formattedEnd={formattedEnd}
        subStatus={subStatus}
        phoneNumber={phoneNumber}
        onPhoneNumberChange={setPhoneNumber}
        isInitiating={isInitiating}
        isCanceling={isCanceling}
        priceMonthly={priceMonthly}
        onSubscribe={handleSubscribe}
        onCancel={handleCancel}
      />
    </section>
  );
}

