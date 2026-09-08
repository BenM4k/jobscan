import { Suspense } from "react";
import { requireSession } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import { AddJobForm } from "@/components/AddJobForm";
import { AddJobSkeleton } from "@/components/AddJobSkeleton";

export const instant = false;

async function AddJobFormContent() {
  const sessionResult = await requireSession();

  if (!sessionResult.ok || !sessionResult.value) {
    redirect("/sign-in");
  }

  return <AddJobForm />;
}

export default async function AddJobPage() {
  const sessionResult = await requireSession();
  if (!sessionResult.ok || !sessionResult.value) {
    redirect("/sign-in");
  }

  return (
    <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 z-10">
      <Suspense fallback={<AddJobSkeleton />}>
        <AddJobFormContent />
      </Suspense>
    </main>
  );
}
