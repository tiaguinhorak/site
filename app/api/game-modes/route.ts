import { NextResponse } from "next/server";
import { getGameModesWithRooms } from "@/lib/queries";

export async function GET() {
  const modes = await getGameModesWithRooms();
  return NextResponse.json({
    modes: modes.map((mode) => ({
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
