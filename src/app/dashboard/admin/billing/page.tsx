import { Suspense } from "react";
import { getAdminLedger } from "@/services/admin/admin.service";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BillingPageProps {
  searchParams: Promise<{
    page?: string;
    userId?: string;
  }>;
}

function LedgerSkeleton() {
  return (
    <div className="h-96 bg-slate-100 dark:bg-zinc-800/50 rounded-2xl border border-slate-200 dark:border-zinc-800 animate-pulse" />
  );
}

async function LedgerContent({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; userId?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10) || 1;

  const res = await getAdminLedger({
    page,
    limit: 25,
    userId: params.userId || undefined,
  });

  const data = res.ok
    ? res.value
    : { items: [], totalCount: 0, page: 1, totalPages: 1 };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/80 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              <th className="py-3.5 pl-4 pr-3">Timestamp</th>
              <th className="px-3 py-3.5">User</th>
              <th className="px-3 py-3.5">Action</th>
              <th className="px-3 py-3.5">Amount</th>
              <th className="py-3.5 pl-3 pr-4 text-right">Balance After</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
            {data.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm text-slate-500 dark:text-zinc-400">
                  No credit transactions recorded yet.
                </td>
              </tr>
            ) : (
              data.items.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                >
                  <td className="py-3 pl-4 pr-3 text-xs text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                    {new Date(item.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-sm">
                    <div className="font-medium text-slate-900 dark:text-white">
                      {item.userName || "Unnamed User"}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-zinc-400">
                      {item.userEmail}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-mono">
                      {item.action}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-sm font-semibold">
                    <span
                      className={
                        item.amount > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      }
                    >
                      {item.amount > 0 ? `+${item.amount}` : item.amount}
                    </span>
                  </td>
                  <td className="py-3 pl-3 pr-4 text-right text-sm font-mono text-slate-700 dark:text-zinc-300">
                    {item.balanceAfter}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2 text-xs text-slate-500 dark:text-zinc-400">
        <div>
          Showing {data.items.length} of {data.totalCount} entries
        </div>
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link
              href={`/dashboard/admin/billing?page=${page - 1}${
                params.userId ? `&userId=${encodeURIComponent(params.userId)}` : ""
              }`}
            >
              <Button size="sm" variant="outline" className="h-8 px-2 text-xs">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
            </Link>
          ) : (
            <Button size="sm" variant="outline" disabled className="h-8 px-2 text-xs">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
          )}

          <span className="font-medium text-slate-900 dark:text-white">
            Page {page} of {data.totalPages}
          </span>

          {page < data.totalPages ? (
            <Link
              href={`/dashboard/admin/billing?page=${page + 1}${
                params.userId ? `&userId=${encodeURIComponent(params.userId)}` : ""
              }`}
            >
              <Button size="sm" variant="outline" className="h-8 px-2 text-xs">
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          ) : (
            <Button size="sm" variant="outline" disabled className="h-8 px-2 text-xs">
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default async function AdminBillingPage({
  searchParams,
}: BillingPageProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Coins className="w-5 h-5 text-amber-500" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Credit Audit Ledger
        </h2>
      </div>
      <p className="text-sm text-slate-500 dark:text-zinc-400">
        Immutable, append-only financial journal tracking credit grants, purchases, refunds, and usage burns.
      </p>

      <Suspense fallback={<LedgerSkeleton />}>
        <LedgerContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
