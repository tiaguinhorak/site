import type { Locale } from "@/lib/i18n";
import { getNamespace } from "@/lib/i18n/catalog";
import type ptBR from "@/messages/pt-BR.json";
import { DomainError } from "@/lib/errors/domain";

type MessageRecord = Record<string, string>;

function interpolate(template: string, params: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`);
}

export function domainMessage(
  locale: Locale,
  namespace: DomainError["namespace"],
  key: string,
  params?: Record<string, string>,
): string {
  const catalog = getNamespace(
    locale,
    namespace as keyof typeof ptBR,
  ) as MessageRecord;
  const template = catalog[key];
  if (!template) return key;
  return params ? interpolate(template, params) : template;
}

export function resolveDomainError(
  locale: Locale,
  err: DomainError,
): string {
  return domainMessage(locale, err.namespace, err.key, err.params);
}
