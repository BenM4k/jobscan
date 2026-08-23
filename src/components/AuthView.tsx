import React, { Suspense } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { SignInForm } from "@/components/auth/SignInForm";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { AuthLoadingFallback } from "@/components/auth/AuthLoadingFallback";

interface AuthViewProps {
  mode: "sign-in" | "sign-up" | "forgot-password" | "reset-password";
}

export function AuthView({ mode }: AuthViewProps) {
  return (
    <AuthLayout>
      {mode === "sign-in" && <SignInForm />}
      {mode === "sign-up" && <SignUpForm />}
      {mode === "forgot-password" && <ForgotPasswordForm />}
      {mode === "reset-password" && (
        <Suspense fallback={<AuthLoadingFallback />}>
          <ResetPasswordForm />
        </Suspense>
      )}
    </AuthLayout>
  );
}
