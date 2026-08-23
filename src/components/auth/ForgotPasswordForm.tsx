"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { requestPasswordReset } from "@/services/auth/auth-client";
import { Mail, CheckCircle2 } from "lucide-react";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");

  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const res = await requestPasswordReset({
        email,
        redirectTo,
      });

      if (res?.error) {
        setErrorMsg(res.error.message || "Failed to send reset link");
      } else {
        setIsSubmitted(true);
      }
    } catch {
      setErrorMsg("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
            {t("resetLinkSentTitle")}
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
            {t("resetLinkSentSubtitle", { email })}
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={() => setIsSubmitted(false)}
            className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 font-semibold text-xs py-3 rounded-xl transition cursor-pointer"
          >
            {t("resendEmail")}
          </button>

          <Link
            href="/sign-in"
            className="block text-xs text-blue-600 dark:text-indigo-400 hover:underline font-semibold"
          >
            {t("backToSignIn")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
          {t("forgotPasswordTitle")}
        </h2>
        <p className="text-xs text-gray-500 dark:text-slate-400">
          {t("forgotPasswordSubtitle")}
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-xs font-semibold rounded-2xl flex items-center gap-2">
          <span>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
            {t("emailLabel")}
          </label>
          <div className="relative flex items-center">
            <input
              type="email"
              required
              autoComplete="email"
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200 text-xs font-medium rounded-xl py-3 pl-3 pr-10 focus:ring-2 focus:ring-blue-500 transition"
            />
            <Mail className="absolute right-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-3.5 rounded-xl transition disabled:opacity-50 shadow-lg shadow-blue-500/25 cursor-pointer"
        >
          {isLoading ? t("processing") : t("sendResetLink")}
        </button>
      </form>

      <div className="text-center pt-2 border-t border-gray-100 dark:border-slate-800">
        <Link
          href="/sign-in"
          className="text-xs text-blue-600 dark:text-indigo-400 hover:text-blue-800 font-semibold"
        >
          {t("backToSignIn")}
        </Link>
      </div>
    </>
  );
}
