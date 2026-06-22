import type { Locale } from "@/lib/i18n";

export type ArticleTranslations = {
  en?: { title?: string; excerpt?: string; body?: string };
  es?: { title?: string; excerpt?: string; body?: string };
};

export type ContentTranslations = {
  en?: { title?: string; body?: string };
  es?: { title?: string; body?: string };
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeSlugPart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function slugifyTitle(title: string, suffix = ""): string {
  const base = normalizeSlugPart(title).slice(0, 72);
  const slug = base || "post";
  const withSuffix = suffix ? `${slug}-${normalizeSlugPart(suffix)}` : slug;
  return withSuffix.slice(0, 100);
}

/** Normalizes manual slug input or generates from title when empty/invalid. */
export function resolveArticleSlug(
  rawSlug: string | undefined,
  title: string,
  fallbackSuffix = "",
): string {
  const trimmed = rawSlug?.trim() ?? "";
  let slug = trimmed ? normalizeSlugPart(trimmed).slice(0, 100) : "";

  if (!slug || slug.length < 3 || !SLUG_PATTERN.test(slug)) {
    const fromTitle = slugifyTitle(title);
    if (fromTitle.length >= 3 && SLUG_PATTERN.test(fromTitle)) {
      slug = fromTitle;
    } else {
      slug = slugifyTitle(title || "post", fallbackSuffix || crypto.randomUUID().slice(0, 8));
    }
  }

  return slug;
}

export function pickArticleField(
  locale: Locale,
  pt: string,
  translations: ArticleTranslations | null | undefined,
  field: "title" | "excerpt" | "body",
): string {
  if (locale === "en" && translations?.en?.[field]) return translations.en[field]!;
  if (locale === "es" && translations?.es?.[field]) return translations.es[field]!;
  return pt;
}

export function pickContentField(
  locale: Locale,
  pt: string,
  translations: ContentTranslations | null | undefined,
  field: "title" | "body",
): string {
  if (locale === "en" && translations?.en?.[field]) return translations.en[field]!;
  if (locale === "es" && translations?.es?.[field]) return translations.es[field]!;
  return pt;
}

export function parseArticleTranslations(
  raw: unknown,
): ArticleTranslations | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as ArticleTranslations;
}

export function parseContentTranslations(raw: unknown): ContentTranslations | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as ContentTranslations;
}
