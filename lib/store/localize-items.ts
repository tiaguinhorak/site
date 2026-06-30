import "server-only";

import type { StoreItem } from "@/lib/generated/prisma/client";
import type { Locale } from "@/lib/i18n";
import { localizeRows } from "@/lib/i18n/localize-dynamic";
import { persistDynamicTranslations, stripLocalizationMeta } from "@/lib/i18n/persist-dynamic";
import { prisma } from "@/lib/prisma";

type StoreItemRow = StoreItem & Record<string, unknown>;

export async function localizeStoreItems<T extends StoreItemRow>(
  items: T[],
  locale: Locale,
): Promise<T[]> {
  const localized = await localizeRows("storeItem", items, locale);
  await persistDynamicTranslations(localized, async (id, translations) => {
    await prisma.storeItem.update({
      where: { id },
      data: { translations },
    });
  });
  return localized.map((row) => stripLocalizationMeta(row) as T);
}

export async function refreshStoreItemTranslations(item: StoreItemRow): Promise<void> {
  const { buildEntityTranslations } = await import("@/lib/i18n/localize-dynamic");
  const translations = await buildEntityTranslations("storeItem", item);
  await prisma.storeItem.update({
    where: { id: item.id },
    data: { translations },
  });
}
