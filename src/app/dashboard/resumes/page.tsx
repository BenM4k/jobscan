import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-guard";
import { getCachedMasterResumes } from "@/lib/cached-data";
import { ResumesManager } from "@/components/resumes/ResumesManager";
import { ResumesPageHeader } from "@/components/resumes/ResumesPageHeader";
import { getTranslations } from "next-intl/server";
import { ResumesSkeleton } from "@/components/resumes/ResumesSkeleton";

export async function generateMetadata() {
  const t = await getTranslations("resumes");
  return {
    title: `${t("title")} | Jobpilot`,
    description: t("subtitle"),
  };
}

/** Loads the authenticated user's master resumes for the persona manager. */
async function ResumesContent() {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value) {
    redirect("/sign-in");
  }

  const userId = sessionResult.value.user.id;
  const res = await getCachedMasterResumes(userId);
  const resumes = res.ok ? res.value : [];

  const versionKey = resumes
    .map(
      (r) =>
        `${r.id}_v${r.version}_${r.isActive ? "1" : "0"}_${new Date(r.updatedAt).getTime()}`,
    )
    .join(":");

  return <ResumesManager key={versionKey} initialResumes={resumes} />;
}

/** Renders the localized master-resume management page. */
export default function ResumesPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full space-y-8 z-10">
      <ResumesPageHeader />

      {/* Dynamic Content */}
      <Suspense fallback={<ResumesSkeleton />}>
        <ResumesContent />
      </Suspense>
    </main>
  );
}
