import type { Locale } from "@/lib/i18n";
import { defaultLocale, isLocale } from "@/lib/i18n";
import ptBR from "@/messages/pt-BR.json";
import en from "@/messages/en.json";
import es from "@/messages/es.json";

const catalogs: Record<Locale, typeof ptBR> = {
  "pt-BR": ptBR,
  en,
  es,
};

export function resolveLocale(value: string | undefined | null): Locale {
  return isLocale(value) ? value : defaultLocale;
}

export function getMessageCatalog(locale: Locale): typeof ptBR {
  return catalogs[locale] ?? catalogs[defaultLocale];
}

export function getNamespace<K extends keyof typeof ptBR>(
  locale: Locale,
  namespace: K,
): typeof ptBR[K] {
  return getMessageCatalog(locale)[namespace];
}
