"use server";

import { cookies } from "next/headers";
import { routing, Locale } from "@/i18n/routing";

export async function setLocaleAction(locale: Locale) {
  if (!routing.locales.includes(locale)) {
    return { success: false, error: "Invalid locale" };
  }

  const cookieStore = await cookies();
  cookieStore.set("NEXT_LOCALE", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
  });

  return { success: true };
}
