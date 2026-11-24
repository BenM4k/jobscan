import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ScrollText } from "lucide-react";
import { requireAdmin } from "@/lib/auth-guard";
import { getAdminAuditLogPage } from "@/services/admin/admin.service";
import { Button, buttonVariants } from "@/components/ui/button";

interface AuditPageProps {
  searchParams: Promise<{
    page?: string;
    action?: string;
  }>;
}

function AuditLogSkeleton() {
  return (
    <div className="h-96 bg-slate-100 dark:bg-zinc-800/50 rounded-2xl border border-slate-200 dark:border-zinc-800 animate-pulse" />
  );
}

async function AuditLogContent({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string }>;
}) {
  const adminResult = await requireAdmin();
  if (!adminResult.ok) {
    redirect(adminResult.error.code === "FORBIDDEN" ? "/dashboard" : "/sign-in");
  }

  const params = await searchParams;
  const page = parseInt(params.page || "1", 10) || 1;
  const res = await getAdminAuditLogPage({
    page,
    limit: 25,
    action: params.action || undefined,
  });

  const data = res.ok
    ? res.value
    : { items: [], totalCount: 0, page: 1, totalPages: 1 };

  const actionQuery = params.action
    ? `&action=${encodeURIComponent(params.action)}`
    : "";

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/80 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              <th className="py-3.5 pl-4 pr-3">Timestamp</th>
              <th className="px-3 py-3.5">Actor</th>
              <th className="px-3 py-3.5">Action</th>
              <th className="px-3 py-3.5">Target</th>
              <th className="py-3.5 pl-3 pr-4">Details / Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
            {data.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm text-slate-500 dark:text-zinc-400">
                  No administrative audit records recorded yet.
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
                  <td className="px-3 py-3 text-xs font-medium text-slate-900 dark:text-white">
                    {item.adminEmail || item.adminUserId || "System"}
                  </td>
                  <td className="px-3 py-3 text-xs">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-mono">
                      {item.action}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-600 dark:text-zinc-300">
                    {item.targetEmail || item.targetUserId || "Global"}
                  </td>
                  <td className="py-3 pl-3 pr-4 text-xs text-slate-500 dark:text-zinc-400 max-w-md truncate">
                    {item.reason || (item.metadata ? JSON.stringify(item.metadata) : "—")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-2 text-xs text-slate-500 dark:text-zinc-400">
        <div>
          Showing {data.items.length} of {data.totalCount} events
        </div>
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link
              href={`/dashboard/admin/audit?page=${page - 1}${actionQuery}`}
              className={buttonVariants({
                size: "sm",
                variant: "outline",
                className: "h-8 px-2 text-xs",
              })}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
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
              href={`/dashboard/admin/audit?page=${page + 1}${actionQuery}`}
              className={buttonVariants({
                size: "sm",
                variant: "outline",
                className: "h-8 px-2 text-xs",
              })}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
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

/** Displays a paginated administrative audit trail for roles, bans, grants, gifts, and flags. */
export default async function AdminAuditPage({ searchParams }: AuditPageProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ScrollText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Admin Audit Log
        </h2>
      </div>
      <p className="text-sm text-slate-500 dark:text-zinc-400">
        Chronological record of role updates, account bans, credit grants, gifted subscriptions, and feature flag changes.
      </p>

      <Suspense fallback={<AuditLogSkeleton />}>
        <AuditLogContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
