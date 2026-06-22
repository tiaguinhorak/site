import { flagFromCountryCode } from "@/lib/profile/countries";
import {
  LOBBY_DISPLAY_SLOTS,
  type LobbyPlayerSlot,
  type LobbyRegionFilter,
  type LobbyRoomEnriched,
} from "@/lib/lobby";
import type { SerializedLobbyRoom } from "@/lib/lobby/rooms-service";

const REGION_META: Record<string, { label: string; filter: LobbyRegionFilter }> = {
  BR: { label: "Brasil", filter: "BR" },
  AR: { label: "Argentina", filter: "LATAM" },
  UY: { label: "Uruguay", filter: "LATAM" },
  CL: { label: "Chile", filter: "LATAM" },
  CO: { label: "Colombia", filter: "LATAM" },
  PE: { label: "Peru", filter: "LATAM" },
};

export function enrichUserLobbyRoom(room: SerializedLobbyRoom): LobbyRoomEnriched {
  const regionMeta = REGION_META[room.region] ?? {
    label: room.region,
    filter: "LATAM" as const,
  };

  const displaySlots = Math.min(room.slots, LOBBY_DISPLAY_SLOTS);
  const slots: LobbyPlayerSlot[] = Array.from({ length: displaySlots }, (_, index) => {
    const member = room.members.find((m) => m.slotIndex === index);
    if (!member) return null;
    return {
      id: member.id,
      nickname: member.nickname,
      level: member.level,
      avatarUrl: member.avatarUrl,
      avatarInitials: member.avatarInitials,
      steamVerified: member.steamVerified,
    };
  });

  const levels = slots.filter(Boolean).map((m) => m!.level);
  const avgLevel =
    levels.length > 0
      ? Math.round(levels.reduce((sum, level) => sum + level, 0) / levels.length)
      : 1;

  const locked = room.status === "closed" || room.status === "in_match";

  return {
    id: room.id,
    source: "user",
    name: room.name,
    map: room.map,
    players: room.players,
    slots: room.slots,
    ping: room.ping,
    modeId: room.modeId,
    modeName: room.modeName,
    accent: room.accent,
    region: room.region,
    regionFlag: flagFromCountryCode(room.region),
    regionLabel: regionMeta.label,
    avgLevel,
    verified: room.members.filter((m) => m.steamVerified).length >= 3,
    locked,
    displaySlots,
    members: slots,
    hostUserId: room.hostUserId,
    hostNickname: room.hostNickname,
    visibility: room.visibility as "public" | "private",
    hasPassword: room.hasPassword,
    status: room.status as LobbyRoomEnriched["status"],
    isHost: room.isHost,
    isMember: room.isMember,
    settings: room.settings,
  };
}

export function enrichUserLobbyRooms(rooms: SerializedLobbyRoom[]): LobbyRoomEnriched[] {
  return rooms.map(enrichUserLobbyRoom);
}
