import * as rootParams from "next/root-params";
import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { cookies } from "next/headers";
import { routing, Locale } from "./routing";
import enMessages from "../../messages/en.json";
import frMessages from "../../messages/fr.json";

const messagesMap: Record<Locale, typeof enMessages> = {
  en: enMessages,
  fr: frMessages,
};

async function getFallbackLocale(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
    if (cookieLocale && hasLocale(routing.locales, cookieLocale)) {
      return cookieLocale;
    }
  } catch {
    // cookies() unavailable in non-request environments
  }
  return routing.defaultLocale;
}

export default getRequestConfig(async ({ locale }) => {
  if (!locale) {
    try {
      const paramValue = await (rootParams as { locale?: () => Promise<string> }).locale?.();
      if (paramValue && hasLocale(routing.locales, paramValue)) {
        locale = paramValue;
      } else {
        locale = await getFallbackLocale();
      }
    } catch {
      locale = await getFallbackLocale();
    }
  }

  return {
    locale,
    messages: messagesMap[locale as Locale] ?? enMessages,
  };
});
