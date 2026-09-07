import { Suspense } from "react";
import * as jobsDal from "@/dal/jobs.dal";
import { requireSession } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { JobDetailView } from "@/components/job/JobDetailView";
import { JobDetailSkeleton } from "@/components/job/JobDetailSkeleton";

export const instant = false;

interface JobDetailPageProps {
  params: Promise<{ jobId: string }>;
}

async function JobDetailContent({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const sessionResult = await requireSession();

  if (!sessionResult.ok || !sessionResult.value) {
    redirect("/sign-in");
  }

  const { jobId } = await params;
  const jobResult = await jobsDal.getJobById(jobId, sessionResult.value.user.id);

  if (!jobResult.ok || !jobResult.value) {
    return (
      <div className="py-12 border-b border-border/40">
        <div className="flex items-start gap-3">
          <AlertCircle className="size-[18px] text-muted-foreground shrink-0 mt-0.5" />
          <div className="space-y-1 font-sans">
            <h2 className="text-sm font-medium text-foreground dark:text-zinc-100">
              Job posting not found
            </h2>
            <p className="text-sm text-gray-500 dark:text-zinc-400 font-normal leading-relaxed max-w-md">
              The requested opportunity could not be found or may have been removed from your pipeline.
            </p>
            <div className="pt-2">
              <Link
                href="/dashboard"
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="size-[18px]" />
                <span>Return to pipeline</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <JobDetailView initialJob={jobResult.value} />;
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value) {
    redirect("/sign-in");
  }

  return (
    <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 font-sans">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-muted-foreground font-normal font-sans">
        <Link
          href="/dashboard"
          className="hover:text-foreground transition-colors inline-flex items-center gap-1.5 font-normal"
        >
          <ArrowLeft className="size-[18px]" />
          <span>Pipeline</span>
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-foreground dark:text-zinc-100 font-medium">
          Job opportunity
        </span>
      </nav>

      <Suspense fallback={<JobDetailSkeleton />}>
        <JobDetailContent params={params} />
      </Suspense>
    </main>
  );
}
