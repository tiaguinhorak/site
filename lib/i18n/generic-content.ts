import type { Locale } from "@/lib/i18n";

/** Traduções dinâmicas por locale — chaves = campos do model (name, description, …). */
export type GenericFieldTranslations = {
  en?: Record<string, string>;
  es?: Record<string, string>;
};

export function parseGenericTranslations(raw: unknown): GenericFieldTranslations | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as GenericFieldTranslations;
}

function localeBucket(
  translations: GenericFieldTranslations | null | undefined,
  locale: Locale,
): Record<string, string> | undefined {
  if (locale === "en") return translations?.en;
  if (locale === "es") return translations?.es;
  return undefined;
}

function storedFieldUsable(stored: string | undefined, source: string): boolean {
  const trimmed = stored?.trim();
  return Boolean(trimmed && trimmed !== source.trim());
}

export function pickGenericField(
  locale: Locale,
  field: string,
  sourceValue: string,
  translations: GenericFieldTranslations | null | undefined,
): string {
  if (locale === "en" && translations?.en?.[field]) return translations.en[field]!;
  if (locale === "es" && translations?.es?.[field]) return translations.es[field]!;
  return sourceValue;
}

export function pickGenericFields(
  locale: Locale,
  fields: Record<string, string>,
  translations: GenericFieldTranslations | null | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    out[key] = pickGenericField(locale, key, value, translations);
  }
  return out;
}

/** Campos traduzíveis por entidade (PT = valor primário no banco). */
export const TRANSLATABLE_FIELDS = {
  storeItem: ["name", "description", "badge", "type", "tagText"],
  gameMode: ["name", "tagline", "description"],
  gameModeRoom: ["name"],
  marketingFeature: ["title", "description"],
  subscriptionPlan: ["name", "period", "badge", "features", "cta"],
  siteStat: ["label"],
  warmupMode: ["label"],
} as const;

export type TranslatableEntity = keyof typeof TRANSLATABLE_FIELDS;

export function extractTranslatableFields(
  entity: TranslatableEntity,
  row: Record<string, unknown>,
): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const key of TRANSLATABLE_FIELDS[entity]) {
    const raw = row[key];
    if (key === "features") {
      if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw) as unknown;
          if (Array.isArray(parsed) && parsed.length > 0) {
            fields[key] = parsed.map(String).join("|||");
          }
        } catch {
          if (raw.trim()) fields[key] = raw.trim();
        }
      } else if (Array.isArray(raw) && raw.length > 0) {
        fields[key] = raw.map(String).join("|||");
      }
      continue;
    }
    if (typeof raw === "string" && raw.trim()) {
      fields[key] = raw.trim();
    }
  }
  return fields;
}

export async function resolveGenericFieldsForLocale(
  locale: Locale,
  fields: Record<string, string>,
  translations: GenericFieldTranslations | null | undefined,
  translateMissing: (missing: Record<string, string>, locale: Locale) => Promise<Record<string, string>>,
): Promise<{
  values: Record<string, string>;
  translations: GenericFieldTranslations | null;
  translated: boolean;
}> {
  if (locale === "pt-BR") {
    return { values: fields, translations: translations ?? null, translated: false };
  }

  const bucket = localeBucket(translations, locale) ?? {};
  const toTranslate: Record<string, string> = {};
  let translated = false;

  for (const [field, source] of Object.entries(fields)) {
    if (!source.trim()) continue;
    if (!storedFieldUsable(bucket[field], source)) {
      toTranslate[field] = source;
    }
  }

  let merged: GenericFieldTranslations = { ...(translations ?? {}) };
  if (Object.keys(toTranslate).length > 0) {
    const bundle = await translateMissing(toTranslate, locale);
    translated = true;
    merged = {
      ...merged,
      [locale]: {
        ...bucket,
        ...bundle,
      },
    };
  }

  const values: Record<string, string> = {};
  for (const [field, source] of Object.entries(fields)) {
    values[field] = pickGenericField(locale, field, source, merged);
  }

  return { values, translations: merged, translated };
}
