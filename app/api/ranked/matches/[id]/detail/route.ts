import { NextResponse } from "next/server";
import { fetchMatchDetail } from "@/lib/ranked/match-detail";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const match = await fetchMatchDetail(id);
  if (!match) {
    return NextResponse.json({ error: "Partida não encontrada." }, { status: 404 });
  }
  return NextResponse.json({ match });
}
