import React from "react";
import { Navbar } from "@/components/layout/Navbar";

export default function AddJobLoading() {
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

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-8 z-10">
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
      </main>
    </div>
  );
}
