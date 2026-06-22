export const locales = ["pt-BR", "en", "es"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "pt-BR";

/** Brazil servers / default audience — keeps SSR and client date formatting aligned. */
export const defaultTimeZone = "America/Sao_Paulo";

export const localeLabels: Record<Locale, string> = {
  "pt-BR": "Português",
  en: "English",
  es: "Español",
};

export const localeShort: Record<Locale, string> = {
  "pt-BR": "PT",
  en: "EN",
  es: "ES",
};

export const localeFlags: Record<Locale, string> = {
  "pt-BR": "🇧🇷",
  en: "🇺🇸",
  es: "🇪🇸",
};

export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}
