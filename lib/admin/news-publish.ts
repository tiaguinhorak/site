import "server-only";

import type { ArticleTranslations } from "@/lib/i18n-content";
import { resolveArticleSlug } from "@/lib/i18n-content";
import { buildArticleTranslations } from "@/lib/translation/auto-translate";

export async function buildPublishedNewsTranslations(
  title: string,
  excerpt: string,
  body: string,
): Promise<ArticleTranslations> {
  const { en, es } = await buildArticleTranslations(title, excerpt, body);
  return { en, es };
}

export function resolvePublishedNewsSlug(
  rawSlug: string | undefined,
  title: string,
  fallbackSuffix = "",
): string {
  return resolveArticleSlug(rawSlug, title, fallbackSuffix);
}
