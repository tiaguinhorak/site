import type { Locale } from "@/lib/i18n";
import {
  type ContentTranslations,
  pickContentField,
} from "@/lib/i18n-content";

type MessageCatalog = Record<string, unknown>;

function getNested(catalog: MessageCatalog, key: string): string | undefined {
  const parts = key.split(".");
  let cur: unknown = catalog;
  for (const part of parts) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

function interpolate(template: string, params: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`);
}

export function resolveNotificationText(
  locale: Locale,
  messages: MessageCatalog,
  title: string,
  body: string,
  titleKey: string | null | undefined,
  bodyKey: string | null | undefined,
  params: Record<string, string> | null | undefined,
  translations?: ContentTranslations | null,
): { title: string; body: string } {
  const p = params ?? {};
  const catalog = (messages.notificationMessages as MessageCatalog) ?? {};
  if (titleKey) {
    const resolvedTitle = getNested(catalog, titleKey);
    const resolvedBody = bodyKey ? getNested(catalog, bodyKey) : undefined;
    if (resolvedTitle) {
      return {
        title: interpolate(resolvedTitle, p),
        body: resolvedBody ? interpolate(resolvedBody, p) : body,
      };
    }
  }

  if (translations && locale !== "pt-BR") {
    return {
      title: pickContentField(locale, title, translations, "title"),
      body: pickContentField(locale, body, translations, "body"),
    };
  }

  return { title, body };
}

export function formatRelativeTime(date: Date, locale: Locale): string {
  const diffMs = Date.now() - date.getTime();
  const rtf = new Intl.RelativeTimeFormat(locale === "pt-BR" ? "pt-BR" : locale, {
    numeric: "auto",
  });

  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return rtf.format(0, "second");
  if (minutes < 60) return rtf.format(-minutes, "minute");

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return rtf.format(-hours, "hour");

  const days = Math.floor(hours / 24);
  return rtf.format(-days, "day");
}
