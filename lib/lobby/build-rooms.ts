import { prisma } from "@/lib/prisma";
import { getAvatarInitials } from "@/lib/profile";
import { getDefaultAvatarPresetUrl, resolveUserAvatarUrl } from "@/lib/profile/avatar";
import { flagFromCountryCode } from "@/lib/profile/countries";
import {
  LOBBY_DISPLAY_SLOTS,
  type LobbyPlayer,
  type LobbyPlayerSlot,
  type LobbyRegionFilter,
  type LobbyRoomEnriched,
  type LobbyRoomView,
} from "@/lib/lobby";
import { fetchSteamPlayerSummaries } from "@/lib/steam/profile";
import { mapSteamCountry, type SteamProfileData } from "@/lib/steam/sync-user";

const REGION_META: Record<string, { label: string; filter: LobbyRegionFilter }> = {
  BR: { label: "Brasil", filter: "BR" },
  AR: { label: "Argentina", filter: "LATAM" },
  UY: { label: "Uruguay", filter: "LATAM" },
  CL: { label: "Chile", filter: "LATAM" },
  CO: { label: "Colombia", filter: "LATAM" },
  PE: { label: "Peru", filter: "LATAM" },
};

/** Contas Steam públicas usadas para preencher salas quando o pool local é pequeno. */
const FALLBACK_STEAM_IDS = [
  "76561197960287930",
  "76561198041888059",
  "76561198027905945",
  "76561198034202275",
  "76561198079206775",
  "76561198127329769",
  "76561198003108295",
  "76561198383849447",
  "76561198162925409",
  "76561198255051969",
  "76561198003264818",
  "76561198385802424",
];

type DbSteamUser = {
  id: string;
  steamId: string;
  nickname: string;
  elo: number;
  steamPersonaName: string | null;
  steamAvatarUrl: string | null;
  avatarUrl: string | null;
  avatarPreset: string | null;
  country: string;
  steamCountryCode: string | null;
  steamLinkedAt: Date | null;
};

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function eloToLevel(elo: number): number {
  return Math.max(1, Math.min(20, Math.round(elo / 120)));
}

function isRoomLocked(room: LobbyRoomView): boolean {
  const h = hashString(`${room.id}-locked`);
  return room.players === 0 && h % 5 === 0;
}

function resolveRegionCode(codes: string[], fallback = "BR"): string {
  if (codes.length === 0) return fallback;
  const tally = new Map<string, number>();
  for (const code of codes) {
    tally.set(code, (tally.get(code) ?? 0) + 1);
  }
  return [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? fallback;
}

function buildLobbyPlayer(
  steamId: string,
  steamProfile: SteamProfileData | undefined,
  dbUser?: DbSteamUser,
): LobbyPlayer {
  const personaName =
    steamProfile?.personaName ??
    dbUser?.steamPersonaName ??
    dbUser?.nickname ??
    `Player_${steamId.slice(-4)}`;

  const avatarUrl = dbUser
    ? resolveUserAvatarUrl(dbUser)
    : steamProfile?.avatarUrl ?? getDefaultAvatarPresetUrl();

  const elo = dbUser?.elo ?? 1000 + (hashString(steamId) % 800);

  return {
    id: dbUser?.id ?? steamId,
    nickname: personaName,
    level: eloToLevel(elo),
    avatarUrl,
    avatarInitials: getAvatarInitials("", "", personaName),
    steamVerified: Boolean(dbUser?.steamLinkedAt ?? steamProfile),
    customization: null,
  };
}

function pickSteamIdsForRoom(
  room: LobbyRoomView,
  pool: string[],
  filledCount: number,
): string[] {
  if (pool.length === 0 || filledCount === 0) return [];
  const h = hashString(room.id);
  const ids: string[] = [];
  for (let i = 0; i < filledCount; i += 1) {
    ids.push(pool[(h + i) % pool.length]!);
  }
  return ids;
}

export async function buildLobbyRooms(
  rooms: LobbyRoomView[],
): Promise<LobbyRoomEnriched[]> {
  const dbUsers = await prisma.user.findMany({
    where: { steamId: { not: null } },
    select: {
      id: true,
      steamId: true,
      nickname: true,
      elo: true,
      steamPersonaName: true,
      steamAvatarUrl: true,
      avatarUrl: true,
      avatarPreset: true,
      country: true,
      steamCountryCode: true,
      steamLinkedAt: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 64,
  });

  const usersBySteamId = new Map<string, DbSteamUser>();
  for (const user of dbUsers) {
    if (user.steamId) usersBySteamId.set(user.steamId, user as DbSteamUser);
  }

  const poolSteamIds = [
    ...new Set([
      ...dbUsers.map((u) => u.steamId!).filter(Boolean),
      ...FALLBACK_STEAM_IDS,
    ]),
  ];

  const steamProfiles = await fetchSteamPlayerSummaries(poolSteamIds);

  return rooms.map((room) => {
    const locked = isRoomLocked(room);
    const displaySlots = Math.min(room.slots, LOBBY_DISPLAY_SLOTS);
    const filledCount = Math.min(room.players, displaySlots);
    const assignedSteamIds = pickSteamIdsForRoom(room, poolSteamIds, filledCount);

    const memberCountries: string[] = [];
    const members: LobbyPlayerSlot[] = Array.from({ length: displaySlots }, (_, index) => {
      const steamId = assignedSteamIds[index];
      if (!steamId) return null;

      const dbUser = usersBySteamId.get(steamId);
      const steamProfile = steamProfiles.get(steamId);
      const countryCode =
        mapSteamCountry(steamProfile?.countryCode ?? dbUser?.steamCountryCode ?? null) ??
        dbUser?.country ??
        "BR";
      memberCountries.push(countryCode);

      return buildLobbyPlayer(steamId, steamProfile, dbUser);
    });

    const levels = members.filter((m): m is LobbyPlayer => m !== null).map((m) => m.level);
    const avgLevel =
      levels.length > 0
        ? Math.round(levels.reduce((sum, level) => sum + level, 0) / levels.length)
        : 1;

    const region = resolveRegionCode(memberCountries, "BR");
    const regionMeta = REGION_META[region] ?? {
      label: region,
      filter: "LATAM" as const,
    };

    return {
      ...room,
      region,
      regionFlag: flagFromCountryCode(region),
      regionLabel: regionMeta.label,
      avgLevel,
      verified: members.filter(Boolean).length >= 3 && avgLevel >= 8,
      locked,
      displaySlots,
      members,
    };
  });
}
