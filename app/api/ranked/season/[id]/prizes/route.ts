import { NextResponse } from "next/server";
import { getPublicSeasonPrizes } from "@/lib/ranked/season-prize-display";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const prizes = await getPublicSeasonPrizes(id);
  return NextResponse.json({ prizes });
}
