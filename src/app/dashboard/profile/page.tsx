import { Suspense } from "react";
import * as profileService from "@/services/profile.service";
import { requireSession } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/ProfileForm";

export const instant = false;

async function ProfileFormContent() {
  const sessionResult = await requireSession();

  if (!sessionResult.ok || !sessionResult.value) {
    redirect("/sign-in");
  }

  const profileResult = await profileService.getUserProfile();
  const userProfile = profileResult.ok ? profileResult.value : null;

  return (
    <ProfileForm
      userEmail={sessionResult.value.user.email}
      userName={sessionResult.value.user.name || sessionResult.value.user.email.split("@")[0]}
      initialResumeText={userProfile?.resumeText || ""}
      initialSkills={userProfile?.skills || []}
      initialAiProvider={userProfile?.aiProvider || "gemini"}
      initialSummary={userProfile?.summary || ""}
      initialEducation={userProfile?.education ?? []}
      initialExperience={userProfile?.experience ?? []}
    />
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2 animate-pulse">
      {/* Candidate Hero Header Skeleton */}
      <div className="flex flex-col lg:flex-row items-start gap-12 lg:gap-16 pt-2">
        <div className="flex-1 min-w-0 divide-y divide-slate-200/90 dark:divide-zinc-800">
          {/* Header */}
          <div className="pb-8 sm:pb-10">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-4 sm:gap-5 min-w-0">
                <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-slate-200 dark:bg-zinc-800 shrink-0" />
                <div className="space-y-2">
                  <div className="h-7 w-48 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
                  <div className="h-4 w-60 bg-slate-200 dark:bg-zinc-800 rounded-md" />
                  <div className="flex items-center gap-2 pt-1">
                    <div className="h-5 w-32 bg-slate-200 dark:bg-zinc-800 rounded-md" />
                    <div className="h-5 w-36 bg-slate-200 dark:bg-zinc-800 rounded-md" />
                  </div>
                </div>
              </div>
              <div className="h-8 w-36 bg-slate-200 dark:bg-zinc-800 rounded-xl shrink-0" />
            </div>
          </div>

          {/* Summary */}
          <div className="py-8 sm:py-10 space-y-4">
            <div className="h-4 w-36 bg-slate-200 dark:bg-zinc-800 rounded-md" />
            <div className="space-y-2">
              <div className="h-3.5 w-full bg-slate-200 dark:bg-zinc-800 rounded-md" />
              <div className="h-3.5 w-5/6 bg-slate-200 dark:bg-zinc-800 rounded-md" />
            </div>
          </div>

          {/* Experience */}
          <div className="py-8 sm:py-10 space-y-6">
            <div className="h-4 w-32 bg-slate-200 dark:bg-zinc-800 rounded-md" />
            <div className="space-y-8 sm:space-y-9 pt-1 pl-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-40 bg-slate-200 dark:bg-zinc-800 rounded-md" />
                  <div className="h-3.5 w-24 bg-slate-200 dark:bg-zinc-800 rounded-md" />
                </div>
                <div className="h-3 w-28 bg-slate-200 dark:bg-zinc-800 rounded-md" />
                <div className="h-3 w-4/5 bg-slate-200 dark:bg-zinc-800 rounded-md" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-36 bg-slate-200 dark:bg-zinc-800 rounded-md" />
                  <div className="h-3.5 w-28 bg-slate-200 dark:bg-zinc-800 rounded-md" />
                </div>
                <div className="h-3 w-24 bg-slate-200 dark:bg-zinc-800 rounded-md" />
                <div className="h-3 w-3/4 bg-slate-200 dark:bg-zinc-800 rounded-md" />
              </div>
            </div>
          </div>

          {/* Education */}
          <div className="py-8 sm:py-10 space-y-6">
            <div className="h-4 w-40 bg-slate-200 dark:bg-zinc-800 rounded-md" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-8 pt-1">
              <div className="space-y-1.5">
                <div className="h-4 w-full bg-slate-200 dark:bg-zinc-800 rounded-md" />
                <div className="h-3 w-24 bg-slate-200 dark:bg-zinc-800 rounded-md" />
                <div className="h-3 w-28 bg-slate-200 dark:bg-zinc-800 rounded-md" />
              </div>
              <div className="space-y-1.5">
                <div className="h-4 w-full bg-slate-200 dark:bg-zinc-800 rounded-md" />
                <div className="h-3 w-24 bg-slate-200 dark:bg-zinc-800 rounded-md" />
                <div className="h-3 w-28 bg-slate-200 dark:bg-zinc-800 rounded-md" />
              </div>
            </div>
          </div>

          {/* Skills */}
          <div className="pt-8 sm:pt-10 space-y-4">
            <div className="h-4 w-36 bg-slate-200 dark:bg-zinc-800 rounded-md" />
            <div className="flex flex-wrap gap-2 pt-1">
              <div className="h-6 w-16 bg-slate-200 dark:bg-zinc-800 rounded-sm" />
              <div className="h-6 w-14 bg-slate-200 dark:bg-zinc-800 rounded-sm" />
              <div className="h-6 w-18 bg-slate-200 dark:bg-zinc-800 rounded-sm" />
              <div className="h-6 w-12 bg-slate-200 dark:bg-zinc-800 rounded-sm" />
              <div className="h-6 w-20 bg-slate-200 dark:bg-zinc-800 rounded-sm" />
            </div>
          </div>
        </div>

        {/* Sidebar Skeleton */}
        <div className="w-full lg:w-72 shrink-0 space-y-10">
          <div className="space-y-4">
            <div className="h-3 w-20 bg-slate-200 dark:bg-zinc-800 rounded-md" />
            <div className="space-y-4">
              <div className="h-8 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
              <div className="h-8 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
              <div className="h-8 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
              <div className="h-8 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
              <div className="h-14 bg-slate-200 dark:bg-zinc-800 rounded-xl mt-4" />
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            <div className="flex justify-between">
              <div className="h-3 w-24 bg-slate-200 dark:bg-zinc-800 rounded-md" />
              <div className="h-3 w-10 bg-slate-200 dark:bg-zinc-800 rounded-md" />
            </div>
            <div className="h-1.5 w-full bg-slate-200 dark:bg-zinc-800 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function ProfilePage() {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value) {
    redirect("/sign-in");
  }

  return (
    <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-8 z-10">
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileFormContent />
      </Suspense>
    </main>
  );
}
