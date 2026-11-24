"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export const CREDITS_UPDATED_EVENT = "jobpilot:credits-updated";

/** Dispatches a client-side refresh event for any mounted live credit indicators. */
export function notifyCreditsUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CREDITS_UPDATED_EVENT));
  }
}

/**
 * Keeps a navbar/drawer credit balance synchronized across client route changes,
 * window focus, and custom credit update events while starting from SSR `initialBalance`.
 */
export function useLiveCreditBalance(initialBalance: number): number {
  const pathname = usePathname();
  const [synced, setSynced] = useState<{ base: number; value: number } | null>(
    null
  );
  const prevPathnameRef = useRef<string | null>(null);
  const activeControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const fetchLatestBalance = async () => {
      activeControllerRef.current?.abort();
      const controller = new AbortController();
      activeControllerRef.current = controller;

      try {
        const res = await fetch("/api/billing/balance", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) return;
        const json = (await res.json()) as {
          ok?: boolean;
          value?: { balance?: number };
        };
        if (json?.ok && typeof json.value?.balance === "number") {
          setSynced({ base: initialBalance, value: json.value.balance });
        }
      } catch {
        // Ignore abort or transient offline errors; SSR value remains displayed.
      }
    };

    // Skip initial mount (SSR already loaded fresh balance), fetch on subsequent route transitions
    if (prevPathnameRef.current !== null && prevPathnameRef.current !== pathname) {
      void fetchLatestBalance();
    }
    prevPathnameRef.current = pathname;

    const onRefresh = () => {
      void fetchLatestBalance();
    };

    window.addEventListener("focus", onRefresh);
    window.addEventListener(CREDITS_UPDATED_EVENT, onRefresh);

    return () => {
      activeControllerRef.current?.abort();
      window.removeEventListener("focus", onRefresh);
      window.removeEventListener(CREDITS_UPDATED_EVENT, onRefresh);
    };
  }, [pathname, initialBalance]);

  return synced?.base === initialBalance ? synced.value : initialBalance;
}
