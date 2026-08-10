import React from "react";
import { Navbar } from "@/components/layout/Navbar";

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0C] text-gray-900 dark:text-zinc-100 font-sans flex flex-col relative overflow-hidden transition-colors duration-300">
      {/* Subtle Dot Grid Background Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20"
        style={{
          backgroundImage: `radial-gradient(#CBD5E1 1px, transparent 1px)`,
          backgroundSize: `24px 24px`,
        }}
      />

      <Navbar userEmail="" />

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-8 z-10">
        <div className="space-y-8 max-w-5xl mx-auto animate-pulse">
          {/* Candidate Hero Header Skeleton */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-slate-300 dark:border-zinc-800">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-200 dark:bg-zinc-800 shrink-0" />
              <div className="space-y-2">
                <div className="h-7 w-48 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
                <div className="h-4 w-64 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
                <div className="h-4 w-36 bg-slate-200 dark:bg-zinc-800 rounded-full" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-10 w-32 bg-slate-200 dark:bg-zinc-800 rounded-xl" />
              <div className="h-10 w-10 bg-slate-200 dark:bg-zinc-800 rounded-xl" />
            </div>
          </div>

          {/* Main & Sidebar Grid Skeleton */}
          <div className="flex flex-col lg:flex-row items-start gap-12 pt-2">
            <div className="flex-1 space-y-8 w-full">
              <div className="space-y-3">
                <div className="h-5 w-24 bg-slate-200 dark:bg-zinc-800 rounded-md" />
                <div className="space-y-2">
                  <div className="h-3.5 w-full bg-slate-200 dark:bg-zinc-800 rounded-md" />
                  <div className="h-3.5 w-4/5 bg-slate-200 dark:bg-zinc-800 rounded-md" />
                  <div className="h-3.5 w-2/3 bg-slate-200 dark:bg-zinc-800 rounded-md" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="h-5 w-28 bg-slate-200 dark:bg-zinc-800 rounded-md" />
                <div className="space-y-4 pl-4 border-l border-slate-300 dark:border-zinc-800">
                  <div className="space-y-2">
                    <div className="h-4 w-48 bg-slate-200 dark:bg-zinc-800 rounded-md" />
                    <div className="h-3.5 w-full bg-slate-200 dark:bg-zinc-800 rounded-md" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-40 bg-slate-200 dark:bg-zinc-800 rounded-md" />
                    <div className="h-3.5 w-5/6 bg-slate-200 dark:bg-zinc-800 rounded-md" />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="h-5 w-20 bg-slate-200 dark:bg-zinc-800 rounded-md" />
                <div className="flex flex-wrap gap-2">
                  <div className="h-7 w-20 bg-slate-200 dark:bg-zinc-800 rounded-xl" />
                  <div className="h-7 w-24 bg-slate-200 dark:bg-zinc-800 rounded-xl" />
                  <div className="h-7 w-16 bg-slate-200 dark:bg-zinc-800 rounded-xl" />
                </div>
              </div>
            </div>

            <div className="w-full lg:w-80 shrink-0 space-y-6">
              <div className="p-6 rounded-3xl bg-white dark:bg-[#121215] border border-slate-300 dark:border-zinc-800 space-y-4">
                <div className="h-4 w-32 bg-slate-200 dark:bg-zinc-800 rounded-md" />
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-16 bg-slate-200 dark:bg-zinc-800 rounded-xl" />
                  <div className="h-16 bg-slate-200 dark:bg-zinc-800 rounded-xl" />
                  <div className="h-16 bg-slate-200 dark:bg-zinc-800 rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
