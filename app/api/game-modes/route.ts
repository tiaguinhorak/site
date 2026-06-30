import { NextResponse } from "next/server";
import { getGameModesWithRooms } from "@/lib/queries";
import { localizeGameModesWithRooms } from "@/lib/lobby/localize-game-modes";
import { getRequestLocale } from "@/lib/i18n/server";

const CASUAL_MODE_SLUGS = new Set(["competitive"]);

export async function GET(request: Request) {
  const locale = await getRequestLocale(request as import("next/server").NextRequest);
  const modes = await localizeGameModesWithRooms(await getGameModesWithRooms(), locale);
  return NextResponse.json({
    modes: modes.filter((mode) => !CASUAL_MODE_SLUGS.has(mode.slug)).map((mode) => ({
      id: mode.slug,
      name: mode.name,
      accent: mode.accent,
      iconKey: mode.iconKey,
      totalPlayers: mode.rooms.reduce((sum, r) => sum + r.players, 0),
      rooms: mode.rooms.map((room) => ({
        id: room.id,
        name: room.name,
        map: room.map,
        players: room.players,
        slots: room.slots,
        ping: room.ping,
      })),
    })),
  });
}
