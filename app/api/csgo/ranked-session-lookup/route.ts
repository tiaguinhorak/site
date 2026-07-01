import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isValidSkinsSyncRequest } from "@/lib/env/skins-sync";
import { prisma } from "@/lib/prisma";

const SYNC_HEADER = "x-skins-sync-key";

export async function GET(request: NextRequest) {
  const providedKey =
    request.headers.get(SYNC_HEADER) ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    null;

  if (!isValidSkinsSyncRequest(providedKey)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roomId = request.nextUrl.searchParams.get("roomId")?.trim() ?? "";
  const csgoMatchId = request.nextUrl.searchParams.get("csgoMatchId")?.trim() ?? "";

  if (!roomId && !csgoMatchId) {
    return NextResponse.json(
      { error: "roomId or csgoMatchId required" },
      { status: 400 },
    );
  }

  const orFilters = [];
  if (roomId) orFilters.push({ id: roomId });
  if (csgoMatchId) orFilters.push({ csgoMatchId });

  const session = await prisma.rankedMatchSession.findFirst({
    where: { OR: orFilters },
    select: {
      id: true,
      status: true,
      csgoMatchId: true,
      resultSyncedAt: true,
      scoreTeamA: true,
      scoreTeamB: true,
      matchFinishedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    found: Boolean(session),
    session,
    hint: !session
      ? "No RankedMatchSession — deleted or roomId/csgoMatchId mismatch"
      : session.resultSyncedAt
        ? "Already synced — replay will skip as already_synced"
        : "Eligible for match-result sync",
  });
}
