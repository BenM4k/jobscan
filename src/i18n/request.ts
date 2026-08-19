import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { routing, Locale } from "./routing";
import enMessages from "../../messages/en.json";
import frMessages from "../../messages/fr.json";

const messagesMap: Record<Locale, typeof enMessages> = {
  en: enMessages,
  fr: frMessages,
};

export default getRequestConfig(async () => {
  const store = await cookies();
  const rawLocale = store.get("NEXT_LOCALE")?.value?.toLowerCase();
  const locale: Locale =
    rawLocale && routing.locales.includes(rawLocale as Locale)
      ? (rawLocale as Locale)
      : routing.defaultLocale;

  return {
    locale,
    messages: messagesMap[locale] ?? enMessages,
  };
});
