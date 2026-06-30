import "server-only";

import { prisma } from "@/lib/prisma";
import { FALLBACK_WARMUP_MODES } from "@/lib/warmup/fallback-modes";
import type { WarmupModeDef } from "@/lib/warmup/modes";

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
}): Promise<WarmupModeRow[]> {
  await seedDefaultWarmupModesIfEmpty();

  const rows = await prisma.warmupMode.findMany({
    where: options?.includeDisabled ? undefined : { enabled: true },
    orderBy: { sortOrder: "asc" },
    include: { maps: { orderBy: { sortOrder: "asc" } } },
  });

  return rows.map(serializeMode);
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
