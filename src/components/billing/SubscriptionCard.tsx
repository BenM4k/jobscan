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

interface SubscriptionCardProps {
  plan?: SubscriptionPlanSelect | null;
  subscription?: SubscriptionSelect | null;
  onSubscriptionUpdated?: () => void;
}

/** Displays subscription plans and manages subscription purchase or cancellation. */
export function SubscriptionCard({
  plan,
  subscription,
  onSubscriptionUpdated,
}: SubscriptionCardProps) {
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
          toast.success("Subscription activated successfully!");
          idempotencyKeyRef.current = crypto.randomUUID();
          onSubscriptionUpdated?.();
        } else if (res.data.status === "failed") {
          setSubStatus("failed");
          setPollingRef(null);
          toast.error("Subscription payment failed. Please try again.");
          idempotencyKeyRef.current = crypto.randomUUID();
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [pollingRef, subStatus, onSubscriptionUpdated]);

  const handleSubscribe = async () => {
    if (!plan) return;
    if (!phoneNumber.trim()) {
      toast.error("Please enter a valid phone number");
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
        toast.error(res.error || "Failed to initiate subscription");
        setIsInitiating(false);
        return;
      }

      setSubStatus("pending");
      setPollingRef(res.data.providerReference);
    } catch {
      toast.error("Unexpected error subscribing");
    } finally {
      setIsInitiating(false);
    }
  };

  const handleCancel = async () => {
    try {
      setIsCanceling(true);
      const res = await cancelSubscriptionAction();
      if (!res.success) {
        toast.error(res.error || "Failed to cancel subscription");
        return;
      }
      toast.success(
        "Subscription canceled. Access continues until period end.",
      );
      onSubscriptionUpdated?.();
    } catch {
      toast.error("Failed to cancel subscription");
    } finally {
      setIsCanceling(false);
    }
  };

  const priceMonthly = plan ? (plan.priceCentsMonthly / 100).toFixed(0) : "15";
  const formattedEnd = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
    : "";

  return (
    <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-linear-to-br from-indigo-50/40 via-white to-purple-50/30 dark:from-indigo-950/20 dark:via-zinc-900/60 dark:to-purple-950/20 p-6 shadow-xs relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Crown className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">
                {plan?.name || t("proPlan")}
              </h2>
              {isActive && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  ACTIVE
                </span>
              )}
              {isCanceled && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  CANCELED
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("subscriptionSubtitle")}
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-black text-foreground">
            ${priceMonthly}
            <span className="text-xs font-normal text-muted-foreground">
              /mo
            </span>
          </div>
        </div>
      </div>

      {/* Feature Checklist */}
      <div className="space-y-2.5 my-5 text-xs text-foreground/90">
        <div className="flex items-center gap-2">
          <div className="size-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Check className="size-3" />
          </div>
          <span>{t("proFeature1")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Check className="size-3" />
          </div>
          <span>{t("proFeature2")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Check className="size-3" />
          </div>
          <span>{t("proFeature3")}</span>
        </div>
      </div>

      {/* Actions */}
      {isActive ? (
        <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {t("subscriptionActive", { date: formattedEnd })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={isCanceling}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
          >
            {isCanceling ? t("canceling") : t("cancelSubscription")}
          </Button>
        </div>
      ) : isCanceled ? (
        <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/40 text-xs text-amber-600 dark:text-amber-400">
          {t("subscriptionCanceled", { date: formattedEnd })}
        </div>
      ) : subStatus === "pending" ? (
        <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center gap-2.5 text-xs">
          <Loader2 className="size-4 animate-spin shrink-0" />
          <span>{t("processingPayment")}</span>
        </div>
      ) : (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Phone className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                placeholder={t("phoneNumberPlaceholder")}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <Button
              onClick={handleSubscribe}
              disabled={isInitiating || !phoneNumber}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 px-4 rounded-xl"
            >
              {isInitiating ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              <span>{t("subscribePro", { price: priceMonthly })}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
