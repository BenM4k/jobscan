"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { resetPassword } from "@/services/auth/auth-client";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { CheckCircle2 } from "lucide-react";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("auth");

  const token = searchParams.get("token");
  const queryError = searchParams.get("error");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState(queryError || "");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!token) {
      setErrorMsg(t("invalidResetToken"));
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg(t("passwordsDoNotMatch"));
      return;
    }

    setIsLoading(true);

    try {
      const res = await resetPassword({
        newPassword: password,
        token: token,
      });

      if (res?.error) {
        setErrorMsg(res.error.message || t("resetPasswordError"));
      } else {
        setSuccessMsg(t("passwordResetSuccess"));
        setTimeout(() => {
          router.push("/sign-in");
        }, 2000);
      }
    } catch {
      setErrorMsg(t("unexpectedError"));
    } finally {
      setIsLoading(false);
    }
  };

  if (!token && !successMsg) {
    return (
      <div className="text-center space-y-4">
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-xs font-semibold rounded-2xl flex items-center gap-2">
          <span>⚠️</span>
          <span>{t("invalidResetToken")}</span>
        </div>
        <Link
          href="/forgot-password"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-3 px-6 rounded-xl transition shadow-lg shadow-blue-500/25"
        >
          {t("forgotPasswordTitle")}
        </Link>
      </div>
    );
  }

  if (successMsg) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
            {t("passwordResetSuccess")}
          </h2>
        </div>

        <div className="pt-2">
          <Link
            href="/sign-in"
            className="inline-block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-3.5 rounded-xl transition shadow-lg shadow-blue-500/25"
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
          {t("resetPasswordTitle")}
        </h2>
        <p className="text-xs text-gray-500 dark:text-slate-400">
          {t("resetPasswordSubtitle")}
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
          <PasswordInput
            label={t("newPasswordLabel")}
            required
            autoComplete="new-password"
            placeholder={t("passwordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div>
          <PasswordInput
            label={t("confirmPasswordLabel")}
            required
            autoComplete="new-password"
            placeholder={t("confirmPasswordPlaceholder")}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-3.5 rounded-xl transition disabled:opacity-50 shadow-lg shadow-blue-500/25 cursor-pointer"
        >
          {isLoading ? t("processing") : t("resetPasswordButton")}
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
