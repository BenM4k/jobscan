import { Suspense } from "react";
import { requireSession } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import { AddJobForm } from "@/components/AddJobForm";

export const instant = false;

async function AddJobFormContent() {
  const sessionResult = await requireSession();

  if (!sessionResult.ok || !sessionResult.value) {
    redirect("/sign-in");
  }

  return <AddJobForm />;
}

function AddJobSkeleton() {
  return (
    <div className="max-w-5xl mx-auto p-6 sm:p-8 bg-white dark:bg-[#121215] border border-slate-300 dark:border-zinc-800 rounded-3xl space-y-6 animate-pulse">
      <div className="space-y-2 border-b border-slate-300 dark:border-zinc-800 pb-5">
        <div className="h-7 w-48 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
        <div className="h-4 w-72 bg-slate-200 dark:bg-zinc-800 rounded-md" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <div className="h-4 w-20 bg-slate-200 dark:bg-zinc-800 rounded-md" />
          <div className="h-11 w-full bg-slate-200 dark:bg-zinc-800 rounded-xl" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-24 bg-slate-200 dark:bg-zinc-800 rounded-md" />
          <div className="h-11 w-full bg-slate-200 dark:bg-zinc-800 rounded-xl" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 w-32 bg-slate-200 dark:bg-zinc-800 rounded-md" />
        <div className="h-32 w-full bg-slate-200 dark:bg-zinc-800 rounded-xl" />
      </div>
    </div>
  );
}

export default async function AddJobPage() {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value) {
    redirect("/sign-in");
  }

  return (
    <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-8 z-10">
      <Suspense fallback={<AddJobSkeleton />}>
        <AddJobFormContent />
      </Suspense>
    </main>
  );
}
