"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CreditPackSelect } from "@/dal/billing.dal";
import {
  initiateCreditPurchaseAction,
  checkPurchaseStatusAction,
} from "@/actions/billing.actions";
import { toast } from "sonner";
import { Coins, Loader2, CheckCircle2, Phone } from "lucide-react";

interface CreditPurchaseSectionProps {
  packs: CreditPackSelect[];
  onBalanceUpdated?: () => void;
}

/** Lets a user select a credit pack and tracks its mobile-money purchase status. */
export function CreditPurchaseSection({
  packs,
  onBalanceUpdated,
}: CreditPurchaseSectionProps) {
  const t = useTranslations("billing");
  const [selectedPackId, setSelectedPackId] = useState<string>(
    packs[1]?.id || packs[0]?.id || ""
  );
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isInitiating, setIsInitiating] = useState(false);
  const [pollingRef, setPollingRef] = useState<string | null>(null);
  const [purchaseStatus, setPurchaseStatus] = useState<
    "idle" | "pending" | "confirmed" | "failed"
  >("idle");

  const selectedPack = packs.find((p) => p.id === selectedPackId);
  const selectedPackRef = useRef(selectedPack);
  useEffect(() => {
    selectedPackRef.current = selectedPack;
  }, [selectedPack]);

  // Keep a single client idempotency key per purchase attempt
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  // Poll status while pending
  useEffect(() => {
    if (!pollingRef || purchaseStatus !== "pending") return;

    const interval = setInterval(async () => {
      const res = await checkPurchaseStatusAction(pollingRef);
      if (res.success && res.data) {
        if (res.data.status === "confirmed") {
          const amount = selectedPackRef.current?.creditAmount ?? "";
          setPurchaseStatus("idle");
          setPollingRef(null);
          toast.success(t("purchaseConfirmed", { amount }));
          idempotencyKeyRef.current = crypto.randomUUID(); // Fresh key for next purchase
          onBalanceUpdated?.();
        } else if (res.data.status === "failed") {
          setPurchaseStatus("idle");
          setPollingRef(null);
          toast.error(t("purchaseFailed"));
          idempotencyKeyRef.current = crypto.randomUUID();
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [pollingRef, purchaseStatus, onBalanceUpdated, t]);

  const handlePurchase = async () => {
    if (!phoneNumber.trim()) {
      toast.error(t("phoneRequired"));
      return;
    }

    try {
      setIsInitiating(true);
      const res = await initiateCreditPurchaseAction({
        creditPackId: selectedPackId,
        phoneNumber: phoneNumber.trim(),
        idempotencyKey: idempotencyKeyRef.current,
      });

      if (!res.success || !res.data) {
        toast.error(res.error || t("initiateError"));
        setIsInitiating(false);
        return;
      }

      setPurchaseStatus("pending");
      setPollingRef(res.data.providerReference);
    } catch {
      toast.error(t("unexpectedError"));
    } finally {
      setIsInitiating(false);
    }
  };

  return (
    <section aria-labelledby="packs-heading" className="space-y-8">
      {/* Section Header */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/60 dark:border-blue-900/40 shrink-0">
            <Coins className="size-4" />
          </div>
          <h2
            id="packs-heading"
            className="text-lg sm:text-xl font-bold text-foreground"
          >
            {t("packsTitle")}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground pl-10.5 max-w-xl leading-relaxed">
          {t("packsSubtitle")}
        </p>
      </div>

      {/* Packs Selection (Clean Flat Options with generous spacing) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {packs.map((pack) => {
          const isSelected = selectedPackId === pack.id;
          const priceFormatted = (pack.priceCents / 100).toFixed(2);
          return (
            <button
              key={pack.id}
              type="button"
              onClick={() => setSelectedPackId(pack.id)}
              disabled={purchaseStatus === "pending"}
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
                {isSelected && (
                  <span className="size-2 rounded-full bg-blue-600" />
                )}
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

      {/* Phone Number Input & Secondary Action */}
      <div className="space-y-4 pt-2 max-w-xl">
        <div className="space-y-1.5">
          <label className="text-xs sm:text-sm font-medium text-foreground flex items-center gap-1.5">
            <Phone className="size-3.5 text-muted-foreground" />
            <span>{t("phoneNumberLabel")}</span>
          </label>
          <input
            type="tel"
            placeholder={t("phoneNumberPlaceholder")}
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            disabled={purchaseStatus === "pending"}
            className="w-full px-3.5 h-10 rounded-lg border border-input bg-transparent text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
          />
        </div>

        {/* Status or Secondary Button */}
        {purchaseStatus === "pending" ? (
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center gap-3 text-xs sm:text-sm">
            <Loader2 className="size-4.5 animate-spin shrink-0" />
            <span>{t("processingPayment")}</span>
          </div>
        ) : purchaseStatus === "confirmed" ? (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-3 text-xs sm:text-sm">
            <CheckCircle2 className="size-4.5 shrink-0" />
            <span>{t("purchaseConfirmed", { amount: "" })}</span>
          </div>
        ) : (
          <Button
            variant="secondary"
            onClick={handlePurchase}
            disabled={isInitiating || !phoneNumber}
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
    </section>
  );
}

export { CreditPurchaseSection as CreditPurchaseCard };

