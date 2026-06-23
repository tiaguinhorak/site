import { prisma } from "@/lib/prisma";
import { CsgoApiError, assertFound } from "@/lib/csgo-api/http";
import {
  serializePlayerSkin,
  serializeSkinCatalog,
  WEAR_FLOAT,
} from "@/lib/csgo-api/serializers";
import type {
  createSkinCatalogSchema,
  equipSkinSchema,
  giveSkinSchema,
  unequipSkinSchema,
} from "@/lib/csgo-api/schemas";
import type { z } from "zod";
import {
  formatClutchSkinsKeyValues,
  type SkinExportWeapon,
} from "@/lib/csgo-api/skin-export-format";
import { steamIdForGamePlugin } from "@/lib/steam/steam-id";
import { buildSyncWeaponsFromEquipped } from "@/lib/inventory/loadout-sync";
import { assertPaintkitCsgoCompatible } from "@/lib/inventory/csgo-paintkit-compat";

type CreateCatalogInput = z.infer<typeof createSkinCatalogSchema>;
type GiveSkinInput = z.infer<typeof giveSkinSchema>;
type EquipInput = z.infer<typeof equipSkinSchema>;
type UnequipInput = z.infer<typeof unequipSkinSchema>;

export async function listSkinCatalog(weaponId?: string) {
  const items = await prisma.csgoSkinCatalog.findMany({
    where: weaponId ? { weaponId } : undefined,
    orderBy: { weaponName: "asc" },
  });
  return items.map(serializeSkinCatalog);
}

export async function getSkinCatalogItem(id: string) {
  const item = await prisma.csgoSkinCatalog.findUnique({ where: { id } });
  return serializeSkinCatalog(assertFound(item, "Skin do catálogo"));
}

export async function createSkinCatalogItem(input: CreateCatalogInput) {
  const existing = await prisma.csgoSkinCatalog.findUnique({ where: { id: input.id } });
  if (existing) throw new CsgoApiError("ID de skin já existe no catálogo.");

  const item = await prisma.csgoSkinCatalog.create({ data: input });
  return serializeSkinCatalog(item);
}

export async function listPlayerSkins(steamId: string) {
  const skins = await prisma.csgoPlayerSkin.findMany({
    where: { steamId },
    include: { skin: true },
    orderBy: { createdAt: "desc" },
  });
  return skins.map((s) => serializePlayerSkin(s));
}

export async function givePlayerSkin(steamId: string, input: GiveSkinInput) {
  const catalogItem = assertFound(
    await prisma.csgoSkinCatalog.findUnique({ where: { id: input.skinId } }),
    "Skin do catálogo",
  );
  await assertPaintkitCsgoCompatible(catalogItem.weaponId, catalogItem.paintkit, true);

  const skin = await prisma.csgoPlayerSkin.create({
    data: {
      steamId,
      skinId: input.skinId,
      wear: input.wear,
      seed: input.seed,
      stattrak: input.stattrak,
      nametag: input.nametag ?? null,
    },
    include: { skin: true },
  });
  return serializePlayerSkin(skin);
}

export async function removePlayerSkin(steamId: string, playerSkinId: string) {
  const skin = await prisma.csgoPlayerSkin.findFirst({
    where: { id: playerSkinId, steamId },
  });
  assertFound(skin, "Skin do jogador");
  await prisma.csgoPlayerSkin.delete({ where: { id: playerSkinId } });
  return { ok: true };
}

export async function getPlayerLoadout(steamId: string, full = false) {
  const equipped = await prisma.csgoPlayerSkin.findMany({
    where: { steamId, equipped: true },
    include: { skin: true },
  });

  if (!full) {
    return equipped.map((s) => ({
      playerSkinId: s.id,
      weaponId: s.skin.weaponId,
      skinId: s.skinId,
      nametag: s.nametag ?? undefined,
    }));
  }

  return equipped.map((s) => ({
    playerSkinId: s.id,
    weaponId: s.skin.weaponId,
    weaponName: s.skin.weaponName,
    skinId: s.skinId,
    paintkit: s.skin.paintkit,
    paintkitName: s.skin.paintkitName,
    wear: s.wear,
    wearFloat: WEAR_FLOAT[s.wear] ?? "0.15",
    seed: s.seed,
    stattrak: s.stattrak,
    stattrakCount: s.stattrakCount,
    nametag: s.nametag ?? undefined,
  }));
}

export async function equipPlayerSkin(steamId: string, input: EquipInput) {
  const found = await prisma.csgoPlayerSkin.findFirst({
    where: { id: input.playerSkinId, steamId },
    include: { skin: true },
  });
  const playerSkin = assertFound(found, "Skin do jogador");

  await assertPaintkitCsgoCompatible(
    playerSkin.skin.weaponId,
    playerSkin.skin.paintkit,
    true,
  );

  await prisma.csgoPlayerSkin.updateMany({
    where: {
      steamId,
      equipped: true,
      skinId: {
        in: (
          await prisma.csgoSkinCatalog.findMany({
            where: { weaponId: playerSkin.skin.weaponId },
            select: { id: true },
          })
        ).map((s) => s.id),
      },
    },
    data: { equipped: false },
  });

  const updated = await prisma.csgoPlayerSkin.update({
    where: { id: input.playerSkinId },
    data: { equipped: true },
    include: { skin: true },
  });
  return serializePlayerSkin(updated);
}

export async function unequipPlayerSkin(steamId: string, input: UnequipInput) {
  const catalogIds = (
    await prisma.csgoSkinCatalog.findMany({
      where: { weaponId: input.weaponId },
      select: { id: true },
    })
  ).map((s) => s.id);

  await prisma.csgoPlayerSkin.updateMany({
    where: { steamId, equipped: true, skinId: { in: catalogIds } },
    data: { equipped: false },
  });
  return { ok: true };
}

function formatKeyValuesExport(steamId: string, weapons: SkinExportWeapon[]): string {
  return formatClutchSkinsKeyValues([
    { steamId: steamIdForGamePlugin(steamId), weapons },
  ]);
}

export async function exportPlayerSkins(steamId: string): Promise<string> {
  const equipped = await prisma.csgoPlayerSkin.findMany({
    where: { steamId, equipped: true },
    include: { skin: true },
  });

  return formatKeyValuesExport(
    steamId,
    equipped.map((s) => ({
      weaponId: s.skin.weaponId,
      paintkit: s.skin.paintkit,
      wear: s.wear,
      seed: s.seed,
      stattrak: s.stattrak,
      stattrakCount: s.stattrakCount,
    })),
  );
}

export type PlayerLoadoutSyncPayload = {
  steamId: string;
  weapons: Array<{
    weaponId: string;
    paintkit: number;
    wear: number;
    seed: number;
    stattrak: boolean;
    stattrakCount: number;
    nametag: string | null;
    /** Glove type defindex (from catalog weaponDefIndex) — needed for glove sync. */
    defIndex?: number;
    /** Terrorist / CT glove loadouts are synced independently. */
    team?: "T" | "CT";
  }>;
};

const EQUIPPED_LOADOUT_WHERE = {
  OR: [{ equippedT: true }, { equippedCT: true }],
};

const CSGO_SYNC_SKIN_WHERE = {
  gameClient: { not: "cs2" },
};

export async function getPlayerLoadoutForSync(steamId64: string): Promise<PlayerLoadoutSyncPayload> {
  await prisma.csgoPlayerSkin.updateMany({
    where: {
      steamId: steamId64,
      equipped: true,
      equippedT: false,
      equippedCT: false,
    },
    data: { equipped: false },
  });

  const equipped = await prisma.csgoPlayerSkin.findMany({
    where: {
      steamId: steamId64,
      ...EQUIPPED_LOADOUT_WHERE,
      skin: CSGO_SYNC_SKIN_WHERE,
    },
    include: { skin: true },
  });

  return {
    steamId: steamIdForGamePlugin(steamId64),
    weapons: buildSyncWeaponsFromEquipped(equipped),
  };
}

/** All equipped loadouts for api-csgo bulk sync (JSON — no KeyValues file). */
export async function getAllEquippedLoadoutsForSync(): Promise<PlayerLoadoutSyncPayload[]> {
  const equipped = await prisma.csgoPlayerSkin.findMany({
    where: {
      ...EQUIPPED_LOADOUT_WHERE,
      skin: CSGO_SYNC_SKIN_WHERE,
    },
    include: { skin: true },
  });

  const bySteam = new Map<string, typeof equipped>();

  for (const row of equipped) {
    const list = bySteam.get(row.steamId) ?? [];
    list.push(row);
    bySteam.set(row.steamId, list);
  }

  return [...bySteam.entries()].map(([steamId64, rows]) => ({
    steamId: steamIdForGamePlugin(steamId64),
    weapons: buildSyncWeaponsFromEquipped(rows),
  }));
}

export async function exportAllPlayerSkins(): Promise<string> {
  const equipped = await prisma.csgoPlayerSkin.findMany({
    where: { equipped: true },
    include: { skin: true },
  });

  const bySteam = new Map<string, SkinExportWeapon[]>();
  for (const row of equipped) {
    const list = bySteam.get(row.steamId) ?? [];
    list.push({
      weaponId: row.skin.weaponId,
      paintkit: row.skin.paintkit,
      wear: row.wear,
      seed: row.seed,
      stattrak: row.stattrak,
      stattrakCount: row.stattrakCount,
      nametag: row.nametag,
    });
    bySteam.set(row.steamId, list);
  }

  const loadouts = [...bySteam.entries()].map(([steamId, weapons]) => ({
    steamId: steamIdForGamePlugin(steamId),
    weapons,
  }));

  return formatClutchSkinsKeyValues(loadouts);
}
