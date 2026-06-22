import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, defaultTimeZone, isLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n";
import { intlGetMessageFallback, intlOnError } from "@/lib/i18n/intl-fallbacks";

export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  return {
    locale,
    timeZone: defaultTimeZone,
    messages: (await import(`../messages/${locale}.json`)).default,
    onError: intlOnError,
    getMessageFallback: intlGetMessageFallback,
  };
});
