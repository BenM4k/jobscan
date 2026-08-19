"use client";

import React, { useEffect } from "react";
import { Inter } from "next/font/google";
import { useRouter } from "next/navigation";

const inter = Inter({ subsets: ["latin"] });

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  useEffect(() => {
    // Log fatal uncaught root errors
    console.error("Global Root Error Caught:", error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.className} min-h-screen bg-[#0A0A0C] text-zinc-100 font-sans antialiased flex items-center justify-center p-6 selection:bg-rose-500 selection:text-white relative overflow-hidden`}
      >
        {/* Subtle Background Radial Grid Pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `radial-gradient(#CBD5E1 1px, transparent 1px)`,
            backgroundSize: `24px 24px`,
          }}
        />

        {/* Ambient Glow Background Effect */}
        <div
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-105 h-105 bg-rose-600/10 blur-[120px] rounded-full pointer-events-none"
        />

        <div className="max-w-md w-full text-center space-y-6 bg-[#121215]/90 backdrop-blur-xl border border-zinc-800/80 p-8 sm:p-10 rounded-3xl shadow-2xl z-10 relative">
          {/* Warning Icon Badge */}
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center text-3xl font-black mx-auto shadow-inner">
            ⚠️
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-serif font-medium text-slate-100 tracking-tight">
              Critical System Error
            </h1>
            <p className="text-xs text-zinc-400 leading-relaxed">
              A critical error prevented the application from loading. You can
              try recovering or reloading the application.
            </p>
          </div>

          {/* Error Message & Optional Digest */}
          <div className="space-y-2">
            {error.message && (
              <div className="bg-rose-950/40 border border-rose-900/50 text-rose-300 p-3.5 rounded-xl text-left text-xs font-mono wrap-break-word leading-snug">
                {error.message}
              </div>
            )}
            {error.digest && (
              <p className="text-[10px] font-mono text-zinc-500 text-left px-1">
                Error Digest:{" "}
                <span className="text-zinc-400">{error.digest}</span>
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => reset()}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition duration-150 shadow-md shadow-blue-500/20 cursor-pointer"
            >
              🔄 Try Again
            </button>
            <button
              onClick={() => {
                router.push("/");
              }}
              className="w-full sm:w-auto bg-[#18181B] hover:bg-zinc-800 active:scale-95 border border-zinc-800 text-zinc-300 text-xs font-semibold px-5 py-2.5 rounded-xl hover:border-zinc-700 transition duration-150 cursor-pointer"
            >
              Return Home
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
