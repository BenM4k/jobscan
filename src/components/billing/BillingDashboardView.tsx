"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  CreditPackSelect,
  SubscriptionPlanSelect,
  SubscriptionSelect,
  CreditLedgerSelect,
} from "@/dal/billing.dal";
import { CreditPurchaseCard } from "./CreditPurchaseCard";
import { SubscriptionCard } from "./SubscriptionCard";
import { CreditLedgerHistory } from "./CreditLedgerHistory";
import { Coins, Sparkles } from "lucide-react";
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
    <div className="space-y-6 max-w-5xl mx-auto py-6 px-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-linear-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-md">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <span>{t("billingHub")}</span>
            <Sparkles className="size-5 text-amber-300" />
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 mt-1">
            {t("manageBilling")}
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-xl border border-white/20 flex items-center gap-3">
          <Coins className="size-6 text-amber-300" />
          <div>
            <div className="text-[11px] font-medium text-blue-200 uppercase tracking-wider">
              {t("balance")}
            </div>
            <div className="text-2xl font-black">{initialBalance} credits</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Purchase Packs & Subscription */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CreditPurchaseCard packs={packs} onBalanceUpdated={handleRefresh} />
        <SubscriptionCard
          plan={plans[0]}
          subscription={initialSubscription}
          onSubscriptionUpdated={handleRefresh}
        />
      </div>

      {/* Audit History */}
      <CreditLedgerHistory entries={initialLedger} />
    </div>
  );
}
