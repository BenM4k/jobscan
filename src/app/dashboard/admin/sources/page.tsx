import { Suspense } from "react";
import { getAdminSourcesStatus } from "@/services/admin/admin.service";
import { Database, Activity, AlertTriangle, CheckCircle2 } from "lucide-react";

function SourcesSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-36 bg-slate-100 dark:bg-zinc-800/50 rounded-2xl border border-slate-200 dark:border-zinc-800"
        />
      ))}
    </div>
  );
}

async function SourcesContent() {
  const res = await getAdminSourcesStatus();
  const sources = res.ok ? res.value : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sources.length === 0 ? (
        <div className="col-span-full py-12 text-center text-sm text-slate-500 dark:text-zinc-400">
          No job source activity detected yet.
        </div>
      ) : (
        sources.map((src) => {
          const isHealthy = src.circuitBreakerState !== "open";

          return (
            <div
              key={src.source}
              className="p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-500" />
                  <span className="font-semibold text-slate-900 dark:text-white capitalize">
                    {src.source.replace("_", ".")}
                  </span>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    isHealthy
                      ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                      : "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400"
                  }`}
                >
                  {isHealthy ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <AlertTriangle className="w-3 h-3" />
                  )}
                  {src.circuitBreakerState ? src.circuitBreakerState.toUpperCase() : "HEALTHY"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div>
                  <span className="text-slate-400 dark:text-zinc-500 block">Total Jobs</span>
                  <span className="font-semibold text-slate-900 dark:text-white text-sm">
                    {src.totalJobs.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-zinc-500 block">Failures</span>
                  <span className="font-semibold text-slate-900 dark:text-white text-sm">
                    {src.failureCount}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/60 text-xs text-slate-400 dark:text-zinc-500">
                Last ingested:{" "}
                <span className="text-slate-700 dark:text-zinc-300">
                  {src.lastIngestedAt
                    ? new Date(src.lastIngestedAt).toLocaleDateString()
                    : "Never"}
                </span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default function AdminSourcesPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="w-5 h-5 text-emerald-500" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Job Ingestion Channels & Breakers
        </h2>
      </div>
      <p className="text-sm text-slate-500 dark:text-zinc-400">
        Status of ATS adapters, crawler sources, catalog counts, and adapter circuit breaker health.
      </p>

      <Suspense fallback={<SourcesSkeleton />}>
        <SourcesContent />
      </Suspense>
    </div>
  );
}
