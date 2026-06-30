import "server-only";

import type { Locale } from "@/lib/i18n";
import {
  extractTranslatableFields,
  parseGenericTranslations,
  resolveGenericFieldsForLocale,
  type GenericFieldTranslations,
  type TranslatableEntity,
} from "@/lib/i18n/generic-content";
import { translateFields, buildGenericTranslations } from "@/lib/translation/auto-translate";

async function translateMissing(
  missing: Record<string, string>,
  locale: Locale,
): Promise<Record<string, string>> {
  return translateFields(missing, locale, "pt-BR");
}

export async function localizeEntityFields(
  entity: TranslatableEntity,
  row: Record<string, unknown>,
  locale: Locale,
): Promise<{
  values: Record<string, string>;
  translations: GenericFieldTranslations | null;
  translated: boolean;
}> {
  const fields = extractTranslatableFields(entity, row);
  const stored = parseGenericTranslations(row.translations);
  return resolveGenericFieldsForLocale(locale, fields, stored, translateMissing);
}

export async function buildEntityTranslations(
  entity: TranslatableEntity,
  row: Record<string, unknown>,
): Promise<GenericFieldTranslations> {
  const fields = extractTranslatableFields(entity, row);
  const { en, es } = await buildGenericTranslations(fields);
  return { en, es };
}

export async function localizeRow<T extends Record<string, unknown>>(
  entity: TranslatableEntity,
  row: T,
  locale: Locale,
): Promise<T & { _translations?: GenericFieldTranslations | null; _translated?: boolean }> {
  const { values, translations, translated } = await localizeEntityFields(entity, row, locale);
  const merged = { ...row } as T & { _translations?: GenericFieldTranslations | null; _translated?: boolean };
  for (const [key, value] of Object.entries(values)) {
    (merged as Record<string, unknown>)[key] = value;
  }
  if (translated) {
    merged._translations = translations;
    merged._translated = true;
  }
  return merged;
}

export async function localizeRows<T extends Record<string, unknown>>(
  entity: TranslatableEntity,
  rows: T[],
  locale: Locale,
): Promise<Array<T & { _translations?: GenericFieldTranslations | null; _translated?: boolean }>> {
  return Promise.all(rows.map((row) => localizeRow(entity, row, locale)));
}
