import { Suspense } from "react";
import { requireSession } from "@/lib/auth-guard";
import { getMasterResumesAction } from "@/actions/resume.actions";
import { ResumesManager } from "@/components/resumes/ResumesManager";
import { FileText } from "lucide-react";

export const metadata = {
  title: "Resume Personas | Jobpilot",
  description: "Manage multiple tailored and uploaded master resume personas for AI matching and generation.",
};

async function ResumesContent() {
  const res = await getMasterResumesAction();
  const resumes = res.success && res.data ? res.data : [];

  return <ResumesManager initialResumes={resumes} />;
}

export default async function ResumesPage() {
  await requireSession();

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full space-y-8 z-10">
      {/* Header */}
      <div className="space-y-1.5 border-b border-border/80 pb-6">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border text-xs font-medium font-sans">
          <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Multi-Persona Resumes</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
          Resume Personas
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Manage specialized personas for different job roles, ATS targets, or languages.
          The active persona is used by default for AI scoring, tailored resumes, and cover letters.
        </p>
      </div>

      {/* Dynamic Content */}
      <Suspense
        fallback={
          <div className="space-y-4 animate-pulse">
            <div className="h-28 rounded-xl bg-muted" />
            <div className="h-28 rounded-xl bg-muted" />
          </div>
        }
      >
        <ResumesContent />
      </Suspense>
    </main>
  );
}
