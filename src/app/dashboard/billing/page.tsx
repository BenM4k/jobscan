import React, { Suspense } from "react";
import { requireSession } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import { getCachedBillingData } from "@/lib/cached-data";
import { getBillingOverviewData } from "@/services/billing/billing.service";
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

  let data: Awaited<ReturnType<typeof getCachedBillingData>> | null = null;
  try {
    const cached = await getCachedBillingData(userId);
    if (cached.packs.length > 0 && cached.plans.length > 0) {
      data = cached;
    }
  } catch {
    // Fall back to live overview loader so transient snapshot read errors can recover or propagate cleanly.
  }

  if (!data) {
    const overviewRes = await getBillingOverviewData(userId);
    if (!overviewRes.ok) {
      throw overviewRes.error;
    }
    data = overviewRes.value;
  }

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
