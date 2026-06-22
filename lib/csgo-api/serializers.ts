import type { CsgoMatch, CsgoServer, CsgoPlayerSkin, CsgoSkinCatalog } from "@/lib/generated/prisma/client";
import type { MatchConfig, MatchTeam, PickedMaps, VetoHistoryEntry } from "@/lib/csgo-api/schemas";

export type CsgoServerPublic = {
  id: string;
  name: string;
  host: string;
  sshPort: number;
  rconPort: number;
  csgoDir: string;
  screenSession: string;
  status: string;
  port: number;
  tickrate: number;
};

export type CsgoMatchPublic = {
  id: string;
  roomId: string;
  teamA: MatchTeam;
  teamB: MatchTeam;
  mapPool: string[];
  vetoHistory: VetoHistoryEntry[];
  pickedMaps: PickedMaps;
  status: string;
  serverId?: string;
  selectedMap?: string;
  createdAt: string;
  config: MatchConfig;
};

export function serializeServer(server: CsgoServer): CsgoServerPublic {
  return {
    id: server.id,
    name: server.name,
    host: server.host,
    sshPort: server.sshPort,
    rconPort: server.rconPort,
    csgoDir: server.csgoDir,
    screenSession: server.screenSession,
    status: server.status,
    port: server.port,
    tickrate: server.tickrate,
  };
}

export function serializeMatch(match: CsgoMatch): CsgoMatchPublic {
  return {
    id: match.id,
    roomId: match.roomId,
    teamA: match.teamA as MatchTeam,
    teamB: match.teamB as MatchTeam,
    mapPool: match.mapPool as string[],
    vetoHistory: match.vetoHistory as VetoHistoryEntry[],
    pickedMaps: match.pickedMaps as PickedMaps,
    status: match.status,
    serverId: match.serverId ?? undefined,
    selectedMap: match.selectedMap ?? undefined,
    createdAt: match.createdAt.toISOString(),
    config: match.config as MatchConfig,
  };
}

export function serializeSkinCatalog(item: CsgoSkinCatalog) {
  return {
    id: item.id,
    weaponId: item.weaponId,
    weaponName: item.weaponName,
    paintkit: item.paintkit,
    paintkitName: item.paintkitName,
    rarity: item.rarity,
    category: item.category,
  };
}

export function serializePlayerSkin(skin: CsgoPlayerSkin & { skin?: CsgoSkinCatalog }) {
  return {
    id: skin.id,
    steamId: skin.steamId,
    skinId: skin.skinId,
    wear: skin.wear,
    seed: skin.seed,
    stattrak: skin.stattrak,
    stattrakCount: skin.stattrakCount,
    nametag: skin.nametag ?? undefined,
    equipped: skin.equipped,
    catalog: skin.skin ? serializeSkinCatalog(skin.skin) : undefined,
  };
}

export const WEAR_FLOAT: Record<string, string> = {
  factory_new: "0.001",
  minimal_wear: "0.07",
  field_tested: "0.15",
  well_worn: "0.38",
  battle_scarred: "0.45",
};
