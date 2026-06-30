import "server-only";

import type { Locale } from "@/lib/i18n";
import type { ContentTranslations } from "@/lib/i18n-content";

const googleLang: Record<Locale, string> = {
  "pt-BR": "pt",
  en: "en",
  es: "es",
};

type TranslateTarget = Locale;

/**
 * Free Google Translate endpoint (server-only). Falls back to source text on failure.
 */
export async function translateText(
  text: string,
  target: TranslateTarget,
  source: Locale = "pt-BR",
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (target === source) return trimmed;

  const sl = googleLang[source];
  const tl = googleLang[target];
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(trimmed)}`;

  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return trimmed;
    const data = (await res.json()) as [Array<[string]>, unknown];
    const parts = data[0];
    if (!Array.isArray(parts)) return trimmed;
    return parts.map((chunk) => chunk[0]).join("").trim() || trimmed;
  } catch {
    return trimmed;
  }
}

export async function translateFields(
  fields: Record<string, string>,
  target: TranslateTarget,
  source: Locale = "pt-BR",
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    out[key] = value ? await translateText(value, target, source) : "";
  }
  return out;
}

export async function translateArticleBundle(
  title: string,
  excerpt: string,
  body: string,
  target: TranslateTarget,
  source: Locale = "pt-BR",
): Promise<{ title: string; excerpt: string; body: string }> {
  const translated = await translateFields(
    { title, excerpt, body },
    target,
    source,
  );
  return {
    title: translated.title,
    excerpt: translated.excerpt,
    body: translated.body,
  };
}

export async function translateNotificationBundle(
  title: string,
  body: string,
  target: TranslateTarget,
): Promise<{ title: string; body: string }> {
  const translated = await translateFields({ title, body }, target, "pt-BR");
  return { title: translated.title, body: translated.body };
}

export async function buildNotificationTranslations(
  title: string,
  body: string,
): Promise<ContentTranslations> {
  const en = await translateNotificationBundle(title, body, "en");
  const es = await translateNotificationBundle(title, body, "es");
  return { en, es };
}

export async function buildArticleTranslations(
  title: string,
  excerpt: string,
  body: string,
): Promise<{
  en: { title: string; excerpt: string; body: string };
  es: { title: string; excerpt: string; body: string };
}> {
  const en = await translateArticleBundle(title, excerpt, body, "en", "pt-BR");
  const es = await translateArticleBundle(title, excerpt, body, "es", "pt-BR");
  return { en, es };
}

export async function buildGenericTranslations(
  fields: Record<string, string>,
  source: Locale = "pt-BR",
): Promise<{ en: Record<string, string>; es: Record<string, string> }> {
  const en = await translateFields(fields, "en", source);
  const es = await translateFields(fields, "es", source);
  return { en, es };
}
