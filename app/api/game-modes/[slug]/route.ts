import { NextResponse } from "next/server";
import { getGameModeBySlug } from "@/lib/queries";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const mode = await getGameModeBySlug(slug);
  if (!mode) {
    return NextResponse.json({ error: "Modo não encontrado." }, { status: 404 });
  }

  return NextResponse.json({
    mode: {
      id: mode.slug,
      name: mode.name,
      accent: mode.accent,
      rooms: mode.rooms.map((room) => ({
        id: room.id,
        name: room.name,
        map: room.map,
        players: room.players,
        slots: room.slots,
        ping: room.ping,
      })),
    },
  });
}
