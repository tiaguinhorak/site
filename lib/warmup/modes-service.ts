import "server-only";

import { prisma } from "@/lib/prisma";
import { FALLBACK_WARMUP_MODES } from "@/lib/warmup/fallback-modes";
import type { WarmupModeDef } from "@/lib/warmup/modes";
import type { Locale } from "@/lib/i18n";
import { buildEntityTranslations, localizeRows } from "@/lib/i18n/localize-dynamic";
import { persistDynamicTranslations } from "@/lib/i18n/persist-dynamic";

export type WarmupModeRow = WarmupModeDef & {
  dbId: string;
  sortOrder: number;
};

function serializeMode(
  row: {
    id: string;
    slug: string;
    label: string;
    modeLabel: string;
    iconKey: string;
    accent: string;
    sortOrder: number;
    enabled: boolean;
    translations?: unknown;
    maps: { mapId: string; sortOrder: number }[];
  },
): WarmupModeRow {
  return {
    dbId: row.id,
    id: row.slug,
    slug: row.slug,
    label: row.label,
    modeLabel: row.modeLabel,
    icon: row.iconKey,
    accent: row.accent,
    enabled: row.enabled,
    sortOrder: row.sortOrder,
    maps: row.maps.sort((a, b) => a.sortOrder - b.sortOrder).map((m) => m.mapId),
  };
}

export async function seedDefaultWarmupModesIfEmpty(): Promise<void> {
  const count = await prisma.warmupMode.count();
  if (count > 0) return;

  for (const [index, preset] of FALLBACK_WARMUP_MODES.entries()) {
    await prisma.warmupMode.create({
      data: {
        slug: preset.slug,
        label: preset.label,
        modeLabel: preset.modeLabel,
        iconKey: preset.icon,
        accent: preset.accent,
        sortOrder: index,
        enabled: true,
        maps: {
          create: preset.defaultMaps.map((mapId, mapIndex) => ({
            mapId,
            sortOrder: mapIndex,
          })),
        },
      },
    });
  }
}

export async function listWarmupModes(options?: {
  includeDisabled?: boolean;
  locale?: Locale;
}): Promise<WarmupModeRow[]> {
  await seedDefaultWarmupModesIfEmpty();

  const rows = await prisma.warmupMode.findMany({
    where: options?.includeDisabled ? undefined : { enabled: true },
    orderBy: { sortOrder: "asc" },
    include: { maps: { orderBy: { sortOrder: "asc" } } },
  });

  const serialized = rows.map(serializeMode);
  if (!options?.locale || options.locale === "pt-BR") {
    return serialized;
  }

  const localized = await localizeRows(
    "warmupMode",
    rows.map((row) => ({
      id: row.id,
      label: row.label,
      translations: row.translations,
    })),
    options.locale,
  );

  await persistDynamicTranslations(localized, async (id, translations) => {
    await prisma.warmupMode.update({ where: { id }, data: { translations } });
  });

  const labelByDbId = new Map(localized.map((row) => [row.id, row.label]));

  return serialized.map((mode) => ({
    ...mode,
    label: labelByDbId.get(mode.dbId) ?? mode.label,
  }));
}

export async function refreshWarmupModeTranslations(row: WarmupModeRow): Promise<void> {
  const translations = await buildEntityTranslations("warmupMode", {
    id: row.dbId,
    label: row.label,
  });
  await prisma.warmupMode.update({
    where: { id: row.dbId },
    data: { translations },
  });
}

export function toWarmupModeDef(row: WarmupModeRow): WarmupModeDef {
  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    modeLabel: row.modeLabel,
    icon: row.icon,
    accent: row.accent,
    enabled: row.enabled,
    maps: row.maps,
  };
}
