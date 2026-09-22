import React from "react";
import { ResumesSkeleton } from "@/components/resumes/ResumesSkeleton";

export default function ResumesLoading() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full space-y-8 z-10">
      {/* Header Skeleton */}
      <div className="space-y-2 border-b border-border/80 pb-6 animate-pulse">
        <div className="h-5 w-32 rounded-md bg-muted" />
        <div className="h-8 sm:h-9 w-48 rounded-lg bg-muted" />
        <div className="h-4 w-96 max-w-full rounded-md bg-muted" />
      </div>

      {/* Content Skeleton */}
      <ResumesSkeleton />
    </main>
  );
}
