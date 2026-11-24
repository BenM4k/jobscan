"use client";

import React, { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { sanitizeExternalUrl } from "@/lib/safe-url";
import { CreditPackGrid } from "@/components/billing/CreditPackGrid";
import { useBillingStatusPolling } from "@/hooks/useBillingStatusPolling";
import type { CreditPackSelect } from "@/dal/billing.dal";
import { initiateCreditPurchaseAction } from "@/actions/billing.actions";
import { toast } from "sonner";
import { Coins } from "lucide-react";

interface CreditPurchaseSectionProps {
  packs: CreditPackSelect[];
  onBalanceUpdated?: (newBalance?: number) => void;
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
  const effectivePackId = selectedPackId || packs[1]?.id || packs[0]?.id || "";
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isInitiating, setIsInitiating] = useState(false);
  const [pollingRef, setPollingRef] = useState<string | null>(null);
  const [purchaseStatus, setPurchaseStatus] = useState<
    "idle" | "pending" | "timed_out" | "confirmed" | "failed"
  >("idle");
  const [pendingAttempt, setPendingAttempt] = useState<{
    providerReference: string;
    packId: string;
    creditAmount: number;
  } | null>(null);

  const selectedPack = packs.find((p) => p.id === effectivePackId);

  // Keep a single client idempotency key per purchase attempt (initialized lazily on submit)
  const idempotencyKeyRef = useRef<string | null>(null);

  useBillingStatusPolling({
    pollingRef,
    enabled: purchaseStatus === "pending",
    onConfirmed: (data) => {
      const amount =
        pendingAttempt?.creditAmount ??
        selectedPack?.creditAmount ??
        "";
      setPurchaseStatus("idle");
      setPollingRef(null);
      setPendingAttempt(null);
      toast.success(t("purchaseConfirmed", { amount }));
      idempotencyKeyRef.current = crypto.randomUUID();
      onBalanceUpdated?.(data.balance);
    },
    onFailed: () => {
      setPurchaseStatus("idle");
      setPollingRef(null);
      setPendingAttempt(null);
      toast.error(t("purchaseFailed"));
      idempotencyKeyRef.current = crypto.randomUUID();
    },
    onTimedOut: () => {
      setPurchaseStatus("timed_out");
      toast.error(t("paymentTimedOut"));
    },
  });

  const handleResumeStatusCheck = () => {
    if (!pendingAttempt) return;
    setPollingRef(pendingAttempt.providerReference);
    setPurchaseStatus("pending");
  };

  const handlePurchase = async () => {
    if (pendingAttempt) {
      if (pendingAttempt.packId !== effectivePackId) {
        toast.error(t("paymentTimedOut"));
        return;
      }
      handleResumeStatusCheck();
      return;
    }

    if (!effectivePackId) {
      toast.error(t("initiateError"));
      return;
    }
    if (!phoneNumber.trim()) {
      toast.error(t("phoneRequired"));
      return;
    }

    const idempotencyKey =
      idempotencyKeyRef.current ??
      (idempotencyKeyRef.current = crypto.randomUUID());

    try {
      setIsInitiating(true);
      const res = await initiateCreditPurchaseAction({
        creditPackId: effectivePackId,
        phoneNumber: phoneNumber.trim(),
        idempotencyKey,
      });

      if (!res.success || !res.data) {
        toast.error(res.error || t("initiateError"));
        if (res.error?.toLowerCase().includes("failed")) {
          idempotencyKeyRef.current = crypto.randomUUID();
        }
        setIsInitiating(false);
        return;
      }

      if (res.data.checkoutUrl) {
        const safeUrl = sanitizeExternalUrl(res.data.checkoutUrl, {
          httpsOnly: process.env.NODE_ENV === "production",
        });
        if (!safeUrl) {
          toast.error(t("initiateError"));
          setIsInitiating(false);
          return;
        }
        window.location.href = safeUrl;
        return;
      }

      if (res.data.providerReference) {
        setPendingAttempt({
          providerReference: res.data.providerReference,
          packId: effectivePackId,
          creditAmount: selectedPack?.creditAmount ?? 0,
        });
        setPurchaseStatus("pending");
        setPollingRef(res.data.providerReference);
      } else {
        toast.error(res.error || t("initiateError"));
      }
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

      <CreditPackGrid
        packs={packs}
        selectedPackId={effectivePackId}
        onSelectPack={setSelectedPackId}
        phoneNumber={phoneNumber}
        onPhoneNumberChange={setPhoneNumber}
        purchaseStatus={purchaseStatus}
        pendingAttempt={pendingAttempt}
        isInitiating={isInitiating}
        onPurchase={handlePurchase}
        onResumeStatusCheck={handleResumeStatusCheck}
      />
    </section>
  );
}

