import React from "react";
import { AddJobSkeleton } from "@/components/AddJobSkeleton";

export default function AddJobLoading() {
  return (
    <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 z-10">
      <AddJobSkeleton />
    </main>
  );
}
