import { NextResponse } from "next/server";
import { getMarketingGameModes } from "@/lib/queries";
import { localizeGameModesWithRooms } from "@/lib/lobby/localize-game-modes";
import { getRequestLocale } from "@/lib/i18n/server";

export async function GET() {
  const locale = await getRequestLocale();
  const dbModes = await getMarketingGameModes();
  const localized = await localizeGameModesWithRooms(
    dbModes.map((mode) => ({ ...mode, rooms: [] })),
    locale,
  );
  const modes = localized.map((mode) => ({
    name: mode.name,
    tagline: mode.tagline,
    description: mode.description,
    accent: mode.accent,
    iconKey: mode.iconKey,
  }));
  return NextResponse.json({ modes });
}
