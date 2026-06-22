import type { Locale } from "@/lib/i18n";

const intlLocale: Record<Locale, string> = {
  "pt-BR": "pt-BR",
  en: "en",
  es: "es",
};

export function getCountryDisplayName(code: string, locale: Locale): string {
  if (!code || code.length !== 2) return code;
  try {
    const display = new Intl.DisplayNames([intlLocale[locale]], { type: "region" });
    return display.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}
