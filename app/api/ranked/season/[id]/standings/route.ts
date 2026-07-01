import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { listSeasonStandings } from "@/lib/ranked/season-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Math.min(100, Math.max(1, Number(limitParam))) : 50;

  const standings = await listSeasonStandings(id, limit);
  return NextResponse.json({ standings });
}
