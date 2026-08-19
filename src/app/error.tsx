"use client";

import React, { useEffect } from "react";
import Link from "next/link";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected runtime errors
    console.error("Global App Error Caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0C] text-gray-900 dark:text-zinc-100 font-sans flex items-center justify-center p-6 selection:bg-rose-500 selection:text-white relative overflow-hidden">
      {/* Subtle Dot Grid Background Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20"
        style={{
          backgroundImage: `radial-gradient(#CBD5E1 1px, transparent 1px)`,
          backgroundSize: `24px 24px`,
        }}
      />

      <div className="max-w-md w-full text-center space-y-6 bg-white dark:bg-[#121215] border border-gray-200 dark:border-zinc-800/80 p-8 rounded-3xl shadow-xl z-10">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center text-3xl font-black mx-auto">
          ⚠️
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-serif font-medium text-gray-900 dark:text-slate-100">
            Something went wrong
          </h1>
          <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
            An unexpected application error occurred. You can retry the action
            or return to the main dashboard.
          </p>
        </div>

        {error.message && (
          <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 p-3.5 rounded-xl text-left text-xs font-mono wrap-break-word leading-snug">
            {error.message}
          </div>
        )}

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-md shadow-blue-500/20"
          >
            🔄 Try Again
          </button>
          <Link
            href="/dashboard"
            className="bg-white dark:bg-[#18181B] border border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 text-xs font-semibold px-5 py-2.5 rounded-xl hover:border-gray-300 dark:hover:border-zinc-700 transition"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
