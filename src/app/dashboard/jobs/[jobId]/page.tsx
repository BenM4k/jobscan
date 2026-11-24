import { Suspense } from "react";
import { getCachedJobById, getCachedMasterResumes } from "@/lib/cached-data";
import { getInterviewQuestionsForEntry, type InterviewQuestionItem } from "@/services/interview.service";
import { getJobPipelineTimeline } from "@/services/job-history.service";
import { requireSession } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { JobDetailView } from "@/components/job/JobDetailView";
import { JobDetailSkeleton } from "@/components/job/JobDetailSkeleton";
import { sanitizeJobDescriptionHtml } from "@/lib/sanitize-job-html";

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
  const userId = sessionResult.value.user.id;

  const [jobResult, resumesResult] = await Promise.all([
    getCachedJobById(jobId, userId),
    getCachedMasterResumes(userId),
  ]);

  if (!jobResult.ok || !jobResult.value) {
    return (
      <div className="py-12 border-b border-border/40">
        <div className="flex items-start gap-3">
          <AlertCircle className="size-4.5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="space-y-1 font-sans">
            <h2 className="text-sm font-medium text-foreground dark:text-zinc-100">
              Job posting not found
            </h2>
            <p className="text-sm text-gray-500 dark:text-zinc-400 font-normal leading-relaxed max-w-md">
              The requested opportunity could not be found or may have been
              removed from your pipeline.
            </p>
            <div className="pt-2">
              <Link
                href="/dashboard"
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="size-4.5" />
                <span>Return to pipeline</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const sanitizedDescriptionHtml = jobResult.value.description?.includes("<")
    ? sanitizeJobDescriptionHtml(jobResult.value.description)
    : undefined;

  const entryId = jobResult.value.pipelineEntryId;
  const [questionsRes, timelineRes] = entryId
    ? await Promise.all([
        getInterviewQuestionsForEntry(entryId, userId),
        getJobPipelineTimeline(entryId, userId),
      ])
    : [null, null];

  const initialInterviewQuestions =
    questionsRes?.ok && Array.isArray(questionsRes.value?.questions)
      ? (questionsRes.value.questions as InterviewQuestionItem[])
      : [];
  const initialQuestionSetId = questionsRes?.ok
    ? questionsRes.value?.id
    : undefined;
  const initialQuestionsGeneratedAt =
    questionsRes?.ok && questionsRes.value?.createdAt
      ? questionsRes.value.createdAt.toISOString()
      : undefined;
  const initialTimeline = timelineRes?.ok ? timelineRes.value : [];

  return (
    <JobDetailView
      initialJob={jobResult.value}
      sanitizedDescriptionHtml={sanitizedDescriptionHtml}
      initialResumes={
        resumesResult.ok && resumesResult.value ? resumesResult.value : []
      }
      initialInterviewQuestions={initialInterviewQuestions}
      initialQuestionSetId={initialQuestionSetId}
      initialQuestionsGeneratedAt={initialQuestionsGeneratedAt}
      initialTimeline={initialTimeline}
    />
  );
}

/** Renders a job's detail workspace and defers data loading behind suspense. */
export default function JobDetailPage({ params }: JobDetailPageProps) {
  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 font-sans">
      {/* Breadcrumb Navigation */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-xs text-muted-foreground font-normal font-sans"
      >
        <Link
          href="/dashboard"
          className="hover:text-foreground transition-colors inline-flex items-center gap-1.5 font-normal"
        >
          <ArrowLeft className="size-4.5" />
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
