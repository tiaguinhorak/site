import type { UserProfile } from "@/lib/serializers";
import type { PublicProfileCustomization } from "@/lib/profile/serialize-customization";
import type { LobbyRoomSettings } from "@/lib/lobby/schemas";

export type { LobbyRoomSettings };

export const LOBBY_DISPLAY_SLOTS = 5;

export function canCreateLobbyRoom(plan: UserProfile["plan"]): boolean {
  return plan === "premium" || plan === "elite";
}

export type LobbyRoomView = {
  id: string;
  source?: "user" | "catalog";
  name: string;
  map: string;
  players: number;
  slots: number;
  ping: number;
  modeId: string;
  modeName: string;
  accent: string;
};

export type LobbyPlayer = {
  id: string;
  nickname: string;
  level: number;
  avatarUrl: string | null;
  avatarInitials: string;
  steamVerified: boolean;
  customization: PublicProfileCustomization | null;
};

export type LobbyPlayerSlot = LobbyPlayer | null;

export type LobbyRoomEnriched = LobbyRoomView & {
  region: string;
  regionFlag: string;
  regionLabel: string;
  avgLevel: number;
  verified: boolean;
  locked: boolean;
  displaySlots: number;
  members: LobbyPlayerSlot[];
  hostUserId?: string;
  hostNickname?: string;
  visibility?: "public" | "private";
  hasPassword?: boolean;
  status?: "open" | "full" | "starting" | "in_match" | "closed";
  isHost?: boolean;
  isMember?: boolean;
  settings?: LobbyRoomSettings;
};

export type LobbyStatusFilter = "all" | "open" | "full" | "closed";
export type LobbyRegionFilter = "all" | "BR" | "LATAM";

export type LobbyFilters = {
  search: string;
  modeId: string;
  region: LobbyRegionFilter;
  status: LobbyStatusFilter;
};

export const defaultLobbyFilters: LobbyFilters = {
  search: "",
  modeId: "all",
  region: "all",
  status: "all",
};

const REGION_META: Record<string, { label: string; filter: LobbyRegionFilter }> = {
  BR: { label: "Brasil", filter: "BR" },
  AR: { label: "Argentina", filter: "LATAM" },
  UY: { label: "Uruguay", filter: "LATAM" },
  CL: { label: "Chile", filter: "LATAM" },
};

export function getLobbyRoomStatus(room: LobbyRoomEnriched): LobbyStatusFilter {
  if (room.locked) return "closed";
  if (room.players >= room.slots) return "full";
  return "open";
}

export function applyLobbyFilters(
  rooms: LobbyRoomEnriched[],
  filters: LobbyFilters,
): LobbyRoomEnriched[] {
  const query = filters.search.trim().toLowerCase();

  return rooms.filter((room) => {
    if (filters.modeId !== "all" && room.modeId !== filters.modeId) return false;

    if (filters.region !== "all") {
      const regionFilter = REGION_META[room.region]?.filter ?? "LATAM";
      if (regionFilter !== filters.region) return false;
    }

    const status = getLobbyRoomStatus(room);
    if (filters.status !== "all" && status !== filters.status) return false;

    if (query) {
      const haystack = `${room.name} ${room.map} ${room.modeName} ${room.regionLabel}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });
}

export function pickAutoLobbyRoom(
  rooms: LobbyRoomEnriched[],
  filters: LobbyFilters,
): LobbyRoomEnriched | null {
  const candidates = applyLobbyFilters(rooms, filters).filter(
    (room) => !room.locked && room.players < room.slots,
  );

  if (candidates.length === 0) return null;

  return [...candidates].sort((a, b) => {
    const fillA = a.players / a.slots;
    const fillB = b.players / b.slots;
    if (fillA !== fillB) return fillB - fillA;
    return a.ping - b.ping;
  })[0];
}

export function getLevelTier(level: number): "low" | "mid" | "high" {
  if (level >= 11) return "high";
  if (level >= 6) return "mid";
  return "low";
}
