import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { JobDetailSkeleton } from "@/components/job/JobDetailSkeleton";

export default function JobDetailLoading() {
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

      <JobDetailSkeleton />
    </main>
  );
}
