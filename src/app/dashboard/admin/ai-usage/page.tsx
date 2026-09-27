import { Suspense } from "react";
import { getAdminAiTelemetry } from "@/services/admin/admin.service";
import { AiUsageTable } from "@/components/admin/AiUsageTable";
import { Cpu, Zap, DollarSign } from "lucide-react";

interface AiUsagePageProps {
  searchParams: Promise<{
    page?: string;
    feature?: string;
  }>;
}

function TelemetrySkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-28 bg-slate-100 dark:bg-zinc-800/50 rounded-2xl border border-slate-200 dark:border-zinc-800" />
      <div className="h-96 bg-slate-100 dark:bg-zinc-800/50 rounded-2xl border border-slate-200 dark:border-zinc-800" />
    </div>
  );
}

async function TelemetryContent({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; feature?: string }>;
}) {
  const PAGE_SIZE = 15;
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10) || 1;
  const feature = params.feature || undefined;

  const res = await getAdminAiTelemetry({
    page,
    limit: PAGE_SIZE,
    feature,
  });

  const data = res.ok
    ? res.value
    : { items: [], totalCount: 0, page: 1, totalPages: 1, totalCostUsd: 0 };

  return (
    <div className="space-y-6">
      {/* Cost summary card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400 text-xs font-medium uppercase">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            Estimated Token Cost
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            ${data.totalCostUsd.toFixed(4)} USD
          </div>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
            Aggregated across LLM completions and embeddings
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400 text-xs font-medium uppercase">
            <Zap className="w-4 h-4 text-amber-500" />
            Total Model Calls Logged
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {data.totalCount.toLocaleString()}
          </div>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
            Tracked in `ai_call_log` for audit and cost control
          </p>
        </div>
      </div>

      {/* Paginated Logs Table */}
      <AiUsageTable
        items={data.items}
        totalCount={data.totalCount}
        page={data.page}
        totalPages={data.totalPages}
        feature={feature}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}

export default async function AdminAiUsagePage({
  searchParams,
}: AiUsagePageProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Cpu className="w-5 h-5 text-purple-500" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          AI Telemetry & Token Cost Audit
        </h2>
      </div>
      <p className="text-sm text-slate-500 dark:text-zinc-400">
        In-flight LLM calls, token consumption, cache hits, and estimated
        expenditures.
      </p>

      <Suspense fallback={<TelemetrySkeleton />}>
        <TelemetryContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
