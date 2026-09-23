"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SubscriptionPlanSelect, SubscriptionSelect } from "@/dal/billing.dal";
import {
  initiateSubscriptionAction,
  checkPurchaseStatusAction,
  cancelSubscriptionAction,
} from "@/actions/billing.actions";
import { toast } from "sonner";
import { Crown, Check, Loader2, Phone, Sparkles } from "lucide-react";

interface SubscriptionSectionProps {
  plan?: SubscriptionPlanSelect | null;
  subscription?: SubscriptionSelect | null;
  onSubscriptionUpdated?: () => void;
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

  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  const isActive =
    subscription?.status === "active" &&
    new Date(subscription.currentPeriodEnd) > new Date();

  const isCanceled =
    subscription?.status === "canceled" &&
    new Date(subscription.currentPeriodEnd) > new Date();

  // Polling for subscription confirmation
  useEffect(() => {
    if (!pollingRef || subStatus !== "pending") return;

    const interval = setInterval(async () => {
      const res = await checkPurchaseStatusAction(pollingRef);
      if (res.success && res.data) {
        if (res.data.status === "confirmed") {
          setSubStatus("confirmed");
          setPollingRef(null);
          toast.success(t("subActivated"));
          idempotencyKeyRef.current = crypto.randomUUID();
          onSubscriptionUpdated?.();
        } else if (res.data.status === "failed") {
          setSubStatus("failed");
          setPollingRef(null);
          toast.error(t("subFailed"));
          idempotencyKeyRef.current = crypto.randomUUID();
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [pollingRef, subStatus, onSubscriptionUpdated, t]);

  const handleSubscribe = async () => {
    if (!plan) return;
    if (!phoneNumber.trim()) {
      toast.error(t("phoneRequired"));
      return;
    }

    try {
      setIsInitiating(true);
      const res = await initiateSubscriptionAction({
        planId: plan.id,
        phoneNumber: phoneNumber.trim(),
        idempotencyKey: idempotencyKeyRef.current,
      });

      if (!res.success || !res.data) {
        toast.error(res.error || t("subInitiateError"));
        setIsInitiating(false);
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

      {/* Feature List with increased spacing */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2">
        <div className="flex items-start gap-3 text-xs sm:text-sm text-foreground/90">
          <div className="size-4.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
            <Check className="size-3" />
          </div>
          <span>{t("proFeature1")}</span>
        </div>
        <div className="flex items-start gap-3 text-xs sm:text-sm text-foreground/90">
          <div className="size-4.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
            <Check className="size-3" />
          </div>
          <span>{t("proFeature2")}</span>
        </div>
        <div className="flex items-start gap-3 text-xs sm:text-sm text-foreground/90">
          <div className="size-4.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
            <Check className="size-3" />
          </div>
          <span>{t("proFeature3")}</span>
        </div>
      </div>

      {/* Action Area */}
      {isActive ? (
        <div className="pt-4 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs sm:text-sm">
          <span className="text-muted-foreground">
            {t("subscriptionActive", { date: formattedEnd })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={isCanceling}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs w-fit"
          >
            {isCanceling ? t("canceling") : t("cancelSubscription")}
          </Button>
        </div>
      ) : isCanceled ? (
        <div className="pt-4 border-t border-border/60 text-xs sm:text-sm text-amber-600 dark:text-amber-400">
          {t("subscriptionCanceled", { date: formattedEnd })}
        </div>
      ) : subStatus === "pending" ? (
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center gap-3 text-xs sm:text-sm max-w-xl">
          <Loader2 className="size-4.5 animate-spin shrink-0" />
          <span>{t("processingPayment")}</span>
        </div>
      ) : (
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 max-w-xl">
          <div className="relative flex-1">
            <Phone className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="tel"
              placeholder={t("phoneNumberPlaceholder")}
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full pl-10 pr-3.5 h-10 rounded-lg border border-input bg-transparent text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
            />
          </div>
          <Button
            onClick={handleSubscribe}
            disabled={isInitiating || !phoneNumber}
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
      )}
    </section>
  );
}

export { SubscriptionSection as SubscriptionCard };

