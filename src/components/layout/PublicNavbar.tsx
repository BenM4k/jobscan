import { cookies } from "next/headers";
import { hasLocale } from "next-intl";
import { requireSession } from "@/lib/auth-guard";
import { isAdmin } from "@/services/auth/admin";
import { Navbar } from "@/components/layout/Navbar";
import { routing } from "@/i18n/routing";

/**
 * Resolves optional request-time session and locale outside Navbar's `"use cache"` boundary
 * so public pages (/privacy, /terms) display accurate user and locale state without blocking prerendering.
 */
export async function PublicNavbar() {
  const [sessionResult, cookieStore] = await Promise.all([
    requireSession(),
    cookies(),
  ]);

  const session = sessionResult.ok ? sessionResult.value : null;
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  const locale =
    cookieLocale && hasLocale(routing.locales, cookieLocale)
      ? cookieLocale
      : routing.defaultLocale;

  return (
    <Navbar
      userId={session?.user.id}
      userEmail={session?.user.email}
      userName={session?.user.name}
      isAdmin={session ? isAdmin(session.user) : false}
      locale={locale}
    />
  );
}
