import type { Locale } from "@/lib/i18n";
import type { ArticleTranslations } from "@/lib/i18n-content";

export function articleContentLocale(
  locale: Locale,
  translations: ArticleTranslations | null | undefined,
  field: "title" | "excerpt" | "body",
): Locale {
  if (locale === "en" && translations?.en?.[field]) return "en";
  if (locale === "es" && translations?.es?.[field]) return "es";
  return "pt-BR";
}

export function articlePrimaryLocale(
  locale: Locale,
  translations: ArticleTranslations | null | undefined,
): Locale {
  const titleLocale = articleContentLocale(locale, translations, "title");
  const bodyLocale = articleContentLocale(locale, translations, "body");
  if (titleLocale === bodyLocale) return titleLocale;
  if (titleLocale !== "pt-BR") return titleLocale;
  return bodyLocale;
}

export function localeLabel(locale: Locale): string {
  if (locale === "pt-BR") return "PT";
  if (locale === "en") return "EN";
  return "ES";
}
