"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { signIn, authClient } from "@/services/auth/auth-client";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Fingerprint } from "lucide-react";
import posthog from "posthog-js";

export function SignInForm() {
  const router = useRouter();
  const t = useTranslations("auth");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);

  // WebAuthn conditional UI / autofill mediation
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.PublicKeyCredential?.isConditionalMediationAvailable
    ) {
      window.PublicKeyCredential.isConditionalMediationAvailable()
        .then((available) => {
          if (available) {
            void authClient.signIn.passkey({
              autoFill: true,
              fetchOptions: {
                onSuccess() {
                  posthog.capture("user_signed_in_passkey_autofill");
                  router.push("/dashboard");
                  router.refresh();
                },
              },
            });
          }
        })
        .catch(() => {
          // Conditional mediation not supported or dismissed
        });
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await signIn.email({
        email,
        password,
        rememberMe,
      });

      if (res.error) {
        setErrorMsg(res.error.message || t("signInError"));
      } else {
        posthog.capture("user_signed_in");
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setErrorMsg(t("unexpectedError"));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasskeySignIn = async () => {
    setIsPasskeyLoading(true);
    setErrorMsg("");

    try {
      const res = await authClient.signIn.passkey({
        fetchOptions: {
          onSuccess() {
            posthog.capture("user_signed_in_passkey");
            router.push("/dashboard");
            router.refresh();
          },
          onError(ctx) {
            setErrorMsg(ctx.error.message || t("passkeySignInError"));
          },
        },
      });

      if (res?.error) {
        setErrorMsg(res.error.message || t("passkeySignInError"));
      }
    } catch {
      setErrorMsg(t("passkeySignInError"));
    } finally {
      setIsPasskeyLoading(false);
    }
  };

  return (
    <>
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
          {t("signInTitle")}
        </h2>
        <p className="text-xs text-gray-500 dark:text-slate-400">
          {t("signInSubtitle")}
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
          <input
            type="email"
            required
            autoComplete="username webauthn"
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200 text-base sm:text-xs font-medium rounded-xl p-3 focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
              {t("passwordLabel")}
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-blue-600 dark:text-indigo-400 hover:underline font-semibold"
            >
              {t("forgotPassword")}
            </Link>
          </div>
          <PasswordInput
            required
            autoComplete="current-password webauthn"
            placeholder={t("passwordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between pt-0.5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 bg-gray-50 dark:bg-slate-800 cursor-pointer"
            />
            <span className="text-xs text-gray-600 dark:text-slate-400 font-medium">
              {t("rememberMe")}
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading || isPasskeyLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-3.5 rounded-xl transition disabled:opacity-50 shadow-lg shadow-blue-500/25 cursor-pointer"
        >
          {isLoading ? t("processing") : t("signInButton")}
        </button>
      </form>

      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200 dark:border-slate-800" />
        </div>
        <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
          <span className="bg-white dark:bg-[#111115] px-2 text-gray-400 dark:text-slate-500 font-semibold">
            {t("orDivider")}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={handlePasskeySignIn}
        disabled={isLoading || isPasskeyLoading}
        className="w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200 font-semibold text-xs py-3 rounded-xl transition disabled:opacity-50 cursor-pointer shadow-2xs"
      >
        <Fingerprint className="w-4 h-4 text-blue-600 dark:text-indigo-400" />
        <span>{isPasskeyLoading ? t("processing") : t("signInWithPasskey")}</span>
      </button>

      <div className="text-center pt-2 border-t border-gray-100 dark:border-slate-800">
        <Link
          href="/sign-up"
          className="text-xs text-blue-600 dark:text-indigo-400 hover:text-blue-800 font-semibold"
        >
          {t("dontHaveAccount")}
        </Link>
      </div>
    </>
  );
}
