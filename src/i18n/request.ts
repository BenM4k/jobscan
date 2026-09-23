import * as rootParams from "next/root-params";
import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing, Locale } from "./routing";
import enMessages from "../../messages/en.json";
import frMessages from "../../messages/fr.json";

const messagesMap: Record<Locale, typeof enMessages> = {
  en: enMessages,
  fr: frMessages,
};

export default getRequestConfig(async ({ locale }) => {
  if (!locale) {
    try {
      const paramValue = await (rootParams as { locale?: () => Promise<string> }).locale?.();
      if (paramValue && hasLocale(routing.locales, paramValue)) {
        locale = paramValue;
      } else {
        locale = routing.defaultLocale;
      }
    } catch {
      locale = routing.defaultLocale;
    }
  }

  return {
    locale,
    messages: messagesMap[locale as Locale] ?? enMessages,
  };
});
