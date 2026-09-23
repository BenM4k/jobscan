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

interface CreditPurchaseCardProps {
  packs: CreditPackSelect[];
  onBalanceUpdated?: () => void;
}

export function CreditPurchaseCard({
  packs,
  onBalanceUpdated,
}: CreditPurchaseCardProps) {
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

  // Keep a single client idempotency key per purchase attempt
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  // Poll status while pending
  useEffect(() => {
    if (!pollingRef || purchaseStatus !== "pending") return;

    const interval = setInterval(async () => {
      const res = await checkPurchaseStatusAction(pollingRef);
      if (res.success && res.data) {
        if (res.data.status === "confirmed") {
          setPurchaseStatus("confirmed");
          setPollingRef(null);
          toast.success(t("purchaseConfirmed", { amount: "" }));
          idempotencyKeyRef.current = crypto.randomUUID(); // Fresh key for next purchase
          onBalanceUpdated?.();
        } else if (res.data.status === "failed") {
          setPurchaseStatus("failed");
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
      toast.error("Please enter a valid phone number");
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
        toast.error(res.error || "Failed to initiate purchase");
        setIsInitiating(false);
        return;
      }

      setPurchaseStatus("pending");
      setPollingRef(res.data.providerReference);
    } catch {
      toast.error("Unexpected error starting purchase");
    } finally {
      setIsInitiating(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-6 shadow-xs">
      <div className="flex items-center gap-3 mb-4">
        <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
          <Coins className="size-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {t("packsTitle")}
          </h2>
          <p className="text-xs text-muted-foreground">{t("packsSubtitle")}</p>
        </div>
      </div>

      {/* Packs Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-5">
        {packs.map((pack) => {
          const isSelected = selectedPackId === pack.id;
          const priceFormatted = (pack.priceCents / 100).toFixed(2);
          return (
            <button
              key={pack.id}
              type="button"
              onClick={() => setSelectedPackId(pack.id)}
              disabled={purchaseStatus === "pending"}
              className={`p-4 rounded-xl border text-left transition-all relative ${
                isSelected
                  ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 ring-2 ring-blue-500/20"
                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/20"
              }`}
            >
              <div className="text-sm font-semibold text-foreground">
                {pack.name}
              </div>
              <div className="text-2xl font-bold mt-1 text-foreground">
                ${priceFormatted}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {pack.creditAmount} credits
              </div>
            </button>
          );
        })}
      </div>

      {/* Phone Number Input */}
      <div className="space-y-1.5 my-4">
        <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
          <Phone className="size-3.5 text-muted-foreground" />
          <span>{t("phoneNumberLabel")}</span>
        </label>
        <input
          type="tel"
          placeholder={t("phoneNumberPlaceholder")}
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          disabled={purchaseStatus === "pending"}
          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
        />
      </div>

      {/* Status or Button */}
      {purchaseStatus === "pending" ? (
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center gap-3 text-xs">
          <Loader2 className="size-4 animate-spin shrink-0" />
          <span>{t("processingPayment")}</span>
        </div>
      ) : purchaseStatus === "confirmed" ? (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-3 text-xs">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{t("purchaseConfirmed", { amount: "" })}</span>
        </div>
      ) : (
        <Button
          onClick={handlePurchase}
          disabled={isInitiating || !phoneNumber}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition"
        >
          {isInitiating ? t("initiating") : t("payWithMobileMoney")}
        </Button>
      )}
    </div>
  );
}
