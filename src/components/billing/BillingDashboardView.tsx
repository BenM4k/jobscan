"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  CreditPackSelect,
  SubscriptionPlanSelect,
  SubscriptionSelect,
  CreditLedgerSelect,
} from "@/dal/billing.dal";
import { CreditPurchaseSection } from "./CreditPurchaseCard";
import { SubscriptionSection } from "./SubscriptionCard";
import { CreditLedgerHistory } from "./CreditLedgerHistory";
import { Coins } from "lucide-react";
import { useRouter } from "next/navigation";

interface BillingDashboardViewProps {
  initialBalance: number;
  initialSubscription: SubscriptionSelect | null;
  packs: CreditPackSelect[];
  plans: SubscriptionPlanSelect[];
  initialLedger: CreditLedgerSelect[];
}

/** Displays billing balances, products, subscription controls, and ledger history. */
export function BillingDashboardView({
  initialBalance,
  initialSubscription,
  packs,
  plans,
  initialLedger,
}: BillingDashboardViewProps) {
  const t = useTranslations("billing");
  const router = useRouter();
  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <div className="space-y-12 sm:space-y-14 w-full">
      {/* Header matching Settings and Resumes pages */}
      <div className="space-y-2 border-b border-border/80 pb-8 sm:pb-9 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border text-xs font-medium font-sans mb-2">
            <Coins className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>{t("billingHub")}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
            {t("billingHub")}
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl mt-1 leading-relaxed">
            {t("manageBilling")}
          </p>
        </div>

        {/* Clean Balance Stat Display */}
        <div className="flex items-center gap-3.5 px-5 py-3 rounded-xl border border-border bg-muted/40 shrink-0">
          <div className="size-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/60 dark:border-blue-900/40">
            <Coins className="size-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {t("balance")}
            </div>
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              {initialBalance}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                {t("credits").toLowerCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Divided Sections with generous spacing */}
      <div className="space-y-12 sm:space-y-14 divide-y divide-border/60">
        <SubscriptionSection
          plan={plans[0]}
          subscription={initialSubscription}
          onSubscriptionUpdated={handleRefresh}
        />

        <div className="pt-12 sm:pt-14">
          <CreditPurchaseSection
            packs={packs}
            onBalanceUpdated={handleRefresh}
          />
        </div>

        <div className="pt-12 sm:pt-14">
          <CreditLedgerHistory entries={initialLedger} />
        </div>
      </div>
    </div>
  );
}

