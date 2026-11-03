import React, { Suspense } from "react";
import { requireSession } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import { getCachedBillingData } from "@/lib/cached-data";
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

  const data = await getCachedBillingData(userId);

  return (
    <BillingDashboardView
      initialBalance={data.balance}
      initialSubscription={data.subscription}
      packs={data.packs}
      plans={data.plans}
      initialLedger={data.ledger}
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
