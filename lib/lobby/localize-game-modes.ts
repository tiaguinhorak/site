import "server-only";

import type { Locale } from "@/lib/i18n";
import { buildEntityTranslations, localizeRows } from "@/lib/i18n/localize-dynamic";
import { persistDynamicTranslations, stripLocalizationMeta } from "@/lib/i18n/persist-dynamic";
import { prisma } from "@/lib/prisma";

export async function localizeGameModesWithRooms<
  T extends {
    id: string;
    name: string;
    tagline: string;
    description: string;
    translations?: unknown;
    rooms: Array<{ id: string; name: string; translations?: unknown }>;
  },
>(modes: T[], locale: Locale): Promise<T[]> {
  const localizedModes = await localizeRows("gameMode", modes, locale);
  await persistDynamicTranslations(localizedModes, async (id, translations) => {
    await prisma.gameMode.update({ where: { id }, data: { translations } });
  });

  const result: T[] = [];
  for (const mode of localizedModes) {
    const base = stripLocalizationMeta(mode);
    const localizedRooms = await localizeRows("gameModeRoom", mode.rooms, locale);
    await persistDynamicTranslations(localizedRooms, async (id, translations) => {
      await prisma.gameModeRoom.update({ where: { id }, data: { translations } });
    });
    result.push({
      ...base,
      rooms: localizedRooms.map((room) => stripLocalizationMeta(room)),
    } as T);
  }
  return result;
}

export async function refreshGameModeTranslations(
  mode: Record<string, unknown> & { id: string },
): Promise<void> {
  const translations = await buildEntityTranslations("gameMode", mode);
  await prisma.gameMode.update({
    where: { id: mode.id },
    data: { translations },
  });
}

export async function refreshGameModeRoomTranslations(
  room: Record<string, unknown> & { id: string },
): Promise<void> {
  const translations = await buildEntityTranslations("gameModeRoom", room);
  await prisma.gameModeRoom.update({
    where: { id: room.id },
    data: { translations },
  });
}
