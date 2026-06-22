import "server-only";

import type { Locale } from "@/lib/i18n";
import {
  type ArticleTranslations,
  type ContentTranslations,
  pickArticleField,
  pickContentField,
} from "@/lib/i18n-content";
import { translateFields } from "@/lib/translation/auto-translate";

type ArticleField = "title" | "excerpt" | "body";

function localeBucket(
  translations: ArticleTranslations | null | undefined,
  locale: Locale,
): { title?: string; excerpt?: string; body?: string } | undefined {
  if (locale === "en") return translations?.en;
  if (locale === "es") return translations?.es;
  return undefined;
}

function storedFieldUsable(
  stored: string | undefined,
  source: string,
): boolean {
  const trimmed = stored?.trim();
  return Boolean(trimmed && trimmed !== source.trim());
}

export async function resolveArticleForLocale(
  locale: Locale,
  title: string,
  excerpt: string,
  body: string,
  translations: ArticleTranslations | null | undefined,
): Promise<{
  title: string;
  excerpt: string;
  body: string;
  translations: ArticleTranslations | null;
  translated: boolean;
}> {
  if (locale === "pt-BR") {
    return { title, excerpt, body, translations: translations ?? null, translated: false };
  }

  const sources: Record<ArticleField, string> = { title, excerpt, body };
  const bucket = localeBucket(translations, locale) ?? {};
  const toTranslate: Record<string, string> = {};
  let translated = false;

  for (const field of Object.keys(sources) as ArticleField[]) {
    const source = sources[field];
    if (!source.trim()) continue;
    if (!storedFieldUsable(bucket[field], source)) {
      toTranslate[field] = source;
    }
  }

  let merged: ArticleTranslations = { ...(translations ?? {}) };
  if (Object.keys(toTranslate).length > 0) {
    const bundle = await translateFields(toTranslate, locale, "pt-BR");
    translated = true;
    merged = {
      ...merged,
      [locale]: {
        ...bucket,
        ...bundle,
      },
    };
  }

  return {
    title: pickArticleField(locale, title, merged, "title"),
    excerpt: pickArticleField(locale, excerpt, merged, "excerpt"),
    body: pickArticleField(locale, body, merged, "body"),
    translations: merged,
    translated,
  };
}

export async function resolveNotificationContentForLocale(
  locale: Locale,
  title: string,
  body: string,
  translations: ContentTranslations | null | undefined,
): Promise<{
  title: string;
  body: string;
  translations: ContentTranslations | null;
  translated: boolean;
}> {
  if (locale === "pt-BR") {
    return { title, body, translations: translations ?? null, translated: false };
  }

  const bucket =
    locale === "en" ? translations?.en : locale === "es" ? translations?.es : undefined;
  const toTranslate: Record<string, string> = {};
  let translated = false;

  if (title.trim() && !storedFieldUsable(bucket?.title, title)) {
    toTranslate.title = title;
  }
  if (body.trim() && !storedFieldUsable(bucket?.body, body)) {
    toTranslate.body = body;
  }

  let merged: ContentTranslations = { ...(translations ?? {}) };
  if (Object.keys(toTranslate).length > 0) {
    const bundle = await translateFields(toTranslate, locale, "pt-BR");
    translated = true;
    merged = {
      ...merged,
      [locale]: {
        ...(bucket ?? {}),
        ...bundle,
      },
    };
  }

  return {
    title: pickContentField(locale, title, merged, "title"),
    body: pickContentField(locale, body, merged, "body"),
    translations: merged,
    translated,
  };
}
