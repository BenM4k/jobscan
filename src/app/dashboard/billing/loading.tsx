import { BillingSkeleton } from "@/components/billing/BillingSkeleton";

export default function BillingLoading() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full space-y-8 z-10">
      <BillingSkeleton />
    </main>
  );
}
