"use client";

import React, { useState } from "react";
import { signIn, signUp } from "@/services/auth/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

interface AuthViewProps {
  mode: "sign-in" | "sign-up";
}

export function AuthView({ mode }: AuthViewProps) {
  const router = useRouter();
  const isSignUp = mode === "sign-up";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    if (isSignUp) {
      const res = await signUp.email({
        email,
        password,
        name: name || "User",
      });
      if (res.error) {
        setErrorMsg(res.error.message || "Sign up failed");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } else {
      const res = await signIn.email({
        email,
        password,
      });
      if (res.error) {
        setErrorMsg(res.error.message || "Sign in failed");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-slate-950 flex flex-col justify-center items-center p-6 text-gray-900 dark:text-slate-100 font-sans relative overflow-hidden selection:bg-blue-500 selection:text-white transition-colors duration-300">
      {/* Top Bar Theme Toggle */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      {/* Subtle Dot Grid Background Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20"
        style={{
          backgroundImage: `radial-gradient(#CBD5E1 1px, transparent 1px)`,
          backgroundSize: `24px 24px`,
        }}
      />

      {/* Floating Left Note Widget */}
      <div className="hidden lg:block absolute top-20 left-12 -rotate-3 bg-[#FEF08A] dark:bg-yellow-400 text-gray-900 p-4 rounded-xl shadow-lg border border-yellow-300 max-w-[200px] text-left transform hover:rotate-0 transition duration-300">
        <div className="w-2.5 h-2.5 rounded-full bg-rose-500 mx-auto -mt-2 mb-2 shadow-sm" />
        <p className="text-xs font-handwriting font-bold leading-snug">
          Secure, single-user auth with better-auth & Resend verification!
        </p>
      </div>

      {/* Floating Right Status Widget */}
      <div className="hidden lg:block absolute top-20 right-12 rotate-3 bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200 p-4 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 max-w-[210px] text-left transform hover:rotate-0 transition duration-300">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-bold text-gray-900 dark:text-slate-100">✦ JobPilot Pipeline</span>
        </div>
        <p className="text-[11px] text-gray-500 dark:text-slate-400">Automated candidate fit scoring</p>
        <div className="mt-2 text-[10px] font-mono bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 px-2 py-0.5 rounded font-bold inline-block">
          Active Session Guard
        </div>
      </div>

      {/* Central Brand Badge */}
      <div className="mb-6 z-10 text-center space-y-3">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-lg flex items-center justify-center">
            <div className="grid grid-cols-2 gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-gray-900 dark:bg-slate-100" />
              <span className="w-2.5 h-2.5 rounded-full bg-gray-900 dark:bg-slate-100" />
              <span className="w-2.5 h-2.5 rounded-full bg-gray-900 dark:bg-slate-100" />
            </div>
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-gray-900 dark:text-slate-100">
            JobPilot
          </span>
        </Link>
      </div>

      {/* Card Form */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200/90 dark:border-slate-800 p-8 rounded-3xl max-w-md w-full space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:shadow-none z-10 transition duration-300">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
            {isSignUp ? "Create your account" : "Welcome back"}
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            {isSignUp
              ? "Start managing your job search pipeline in one place"
              : "Sign in to access your job search command center"}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-xs font-semibold rounded-2xl flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                placeholder="Alex Developer"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200 text-xs font-medium rounded-xl p-3 focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="alex@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200 text-xs font-medium rounded-xl p-3 focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200 text-xs font-medium rounded-xl p-3 focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-3.5 rounded-xl transition disabled:opacity-50 shadow-lg shadow-blue-500/25"
          >
            {isLoading
              ? "Processing..."
              : isSignUp
              ? "Create free account"
              : "Sign in to pipeline"}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-gray-100 dark:border-slate-800">
          {isSignUp ? (
            <Link
              href="/sign-in"
              className="text-xs text-blue-600 dark:text-indigo-400 hover:text-blue-800 font-semibold"
            >
              Already have an account? <span className="underline">Sign in</span>
            </Link>
          ) : (
            <Link
              href="/sign-up"
              className="text-xs text-blue-600 dark:text-indigo-400 hover:text-blue-800 font-semibold"
            >
              Don't have an account? <span className="underline">Sign up free</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
