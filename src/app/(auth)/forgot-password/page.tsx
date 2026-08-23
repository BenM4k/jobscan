import { AuthView } from "@/components/AuthView";

export const instant = false;

export default function ForgotPasswordPage() {
  return <AuthView mode="forgot-password" />;
}
