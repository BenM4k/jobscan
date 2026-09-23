import React, { Suspense } from "react";
import { requireSession } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import * as billingDal from "@/dal/billing.dal";
import { BillingDashboardView } from "@/components/billing/BillingDashboardView";
import { BillingSkeleton } from "@/components/billing/BillingSkeleton";

export const metadata = {
  title: "Billing & Credits | Jobpilot",
  description:
    "Manage your Jobpilot AI credits, subscription, and billing history.",
};

/** Loads the authenticated user's billing products, account state, and ledger. */
async function BillingContent() {
  const session = await requireSession();
  if (!session.ok || !session.value) {
    redirect("/sign-in");
  }

  const userId = session.value.user.id;

  const [balanceRes, subRes, packsRes, plansRes, ledgerRes] = await Promise.all(
    [
      billingDal.getCreditBalance(userId),
      billingDal.getUserSubscription(userId),
      billingDal.getCreditPacks(true),
      billingDal.getSubscriptionPlans(true),
      billingDal.getCreditLedger(userId, 50),
    ],
  );

  const balance = balanceRes.ok ? balanceRes.value : 0;
  const subscription = subRes.ok ? subRes.value : null;
  const packs = packsRes.ok ? packsRes.value : [];
  const plans = plansRes.ok ? plansRes.value : [];
  const ledger = ledgerRes.ok ? ledgerRes.value : [];

  return (
    <BillingDashboardView
      initialBalance={balance}
      initialSubscription={subscription}
      packs={packs}
      plans={plans}
      initialLedger={ledger}
    />
  );
}

/** Renders the billing dashboard with its loading fallback. */
export default function BillingPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full space-y-8 z-10">
      <Suspense fallback={<BillingSkeleton />}>
        <BillingContent />
      </Suspense>
    </main>
  );
}
