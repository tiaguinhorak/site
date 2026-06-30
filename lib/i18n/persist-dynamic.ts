import "server-only";

import type { GenericFieldTranslations } from "@/lib/i18n/generic-content";

type RowWithMeta = {
  id: string;
  _translations?: GenericFieldTranslations | null;
  _translated?: boolean;
};

export async function persistDynamicTranslations<T extends RowWithMeta>(
  rows: T[],
  persist: (id: string, translations: GenericFieldTranslations) => Promise<void>,
): Promise<void> {
  const updates = rows.filter((row) => row._translated && row._translations);
  if (updates.length === 0) return;
  await Promise.all(
    updates.map((row) => persist(row.id, row._translations!)),
  );
}

export function stripLocalizationMeta<T extends RowWithMeta>(row: T): Omit<T, "_translations" | "_translated"> {
  const { _translations: _t, _translated: _tr, ...rest } = row;
  return rest;
}
