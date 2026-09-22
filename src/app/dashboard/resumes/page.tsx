import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-guard";
import * as resumeDal from "@/dal/resume.dal";
import { ResumesManager } from "@/components/resumes/ResumesManager";
import { FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ResumesSkeleton } from "@/components/resumes/ResumesSkeleton";

export const instant = false;

export async function generateMetadata() {
  const t = await getTranslations("resumes");
  return {
    title: `${t("title")} | Jobpilot`,
    description: t("subtitle"),
  };
}

async function ResumesContent({ userId }: { userId: string }) {
  const res = await resumeDal.getMasterResumes(userId);
  const resumes = res.ok ? res.value : [];

  const versionKey = resumes
    .map(
      (r) =>
        `${r.id}_v${r.version}_${r.isActive ? "1" : "0"}_${new Date(r.updatedAt).getTime()}`,
    )
    .join(":");

  return <ResumesManager key={versionKey} initialResumes={resumes} />;
}

export default async function ResumesPage() {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value) {
    redirect("/sign-in");
  }

  const t = await getTranslations("resumes");

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full space-y-8 z-10">
      {/* Header */}
      <div className="space-y-1.5 border-b border-border/80 pb-6">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border text-xs font-medium font-sans">
          <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>{t("headerBadge")}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          {t("subtitle")}
        </p>
      </div>

      {/* Dynamic Content */}
      <Suspense fallback={<ResumesSkeleton />}>
        <ResumesContent userId={sessionResult.value.user.id} />
      </Suspense>
    </main>
  );
}
