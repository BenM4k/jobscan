"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { signOut } from "@/services/auth/auth-client";

export function useSignOut() {
  const router = useRouter();

  return useCallback(async () => {
    await signOut();
    posthog.reset();
    router.push("/");
    router.refresh();
  }, [router]);
}
