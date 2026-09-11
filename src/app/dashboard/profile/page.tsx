import { Suspense } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { getUserAiUsage } from "@/services/ai/usage.service";
import { requireSession } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/ProfileForm";
import * as resumeDal from "@/dal/resume.dal";
import { parseResumeContent } from "@/dal/profile.dal";
import { ProfileSkeleton } from "@/components/profile/ProfileSkeleton";

export const instant = false;

function ProfileErrorState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="py-12 border-b border-border/40">
      <div className="flex items-start gap-3">
        <AlertCircle className="size-4.5 text-destructive shrink-0 mt-0.5" />
        <div className="space-y-1 font-sans">
          <h2 className="text-sm font-medium text-foreground dark:text-zinc-100">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground font-normal leading-relaxed max-w-md">
            {message}
          </p>
          <div className="pt-3 flex items-center gap-3">
            <Link
              href="/dashboard/profile"
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1.5"
            >
              <span>Retry</span>
            </Link>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Return to dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

async function ProfileFormContent() {
  const sessionResult = await requireSession();

  if (!sessionResult.ok || !sessionResult.value) {
    redirect("/sign-in");
  }

  const userId = sessionResult.value.user.id;

  const [activeResumeResult, aiUsageResult] = await Promise.all([
    resumeDal.getActiveMasterResume(userId),
    getUserAiUsage(userId),
  ]);

  if (!activeResumeResult.ok) {
    return (
      <ProfileErrorState
        title="Failed to load profile data"
        message="We encountered an issue retrieving your master resume from the database. Your data is safe, but cannot be displayed right now. Please refresh or try again later."
      />
    );
  }

  const activeResume = activeResumeResult.value;
  const aiUsage = aiUsageResult.ok ? aiUsageResult.value : null;
  const aiUsageError = !aiUsageResult.ok;

  let skills: string[] = [];
  if (activeResume) {
    const skillsRes = await resumeDal.getResumeSkills(activeResume.id);
    if (!skillsRes.ok) {
      return (
        <ProfileErrorState
          title="Failed to load resume skills"
          message="We encountered an issue retrieving your skills from the database. To prevent treating your skills as missing, editing is temporarily paused. Please refresh to retry."
        />
      );
    }
    skills = skillsRes.value;
  }

  const resumeText = activeResume?.content || "";
  const parsed = parseResumeContent(resumeText);
  if (skills.length === 0 && parsed.skills.length > 0) {
    skills = parsed.skills;
  }

  return (
    <ProfileForm
      key={activeResume?.id || "empty"}
      userEmail={sessionResult.value.user.email}
      userName={
        sessionResult.value.user.name ||
        sessionResult.value.user.email.split("@")[0]
      }
      initialResumeText={resumeText}
      initialSkills={skills}
      initialAiProvider="gemini"
      initialSummary={parsed.summary}
      initialEducation={parsed.education}
      initialExperience={parsed.experience}
      initialAiUsage={aiUsage}
      aiUsageError={aiUsageError}
      resumeLabel={activeResume?.label || "Primary Persona"}
      resumeVersion={activeResume?.version || 1}
      resumeLanguage={activeResume?.language || "en"}
      resumeSource={activeResume?.source || "uploaded"}
    />
  );
}

export default async function ProfilePage() {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value) {
    redirect("/sign-in");
  }

  return (
    <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 z-10">
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileFormContent />
      </Suspense>
    </main>
  );
}
