import { AuthView } from "@/components/AuthView";

export const instant = false;

export default function ResetPasswordPage() {
  return <AuthView mode="reset-password" />;
}
