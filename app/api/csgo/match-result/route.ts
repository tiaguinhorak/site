import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { isValidSkinsSyncRequest } from "@/lib/env/skins-sync";
import { processMatchResultFromGame } from "@/lib/ranked/match-result-processor";

const SYNC_HEADER = "x-skins-sync-key";

const playerSchema = z.object({
  steamId: z.string().min(5),
  team: z.enum(["A", "B"]),
  kills: z.number().int().min(0),
  deaths: z.number().int().min(0),
  assists: z.number().int().min(0),
  score: z.number().int().min(0),
  mvp: z.number().int().min(0),
});

const bodySchema = z.object({
  csgoMatchId: z.string().min(1),
  roomId: z.string().min(1),
  scoreTeamA: z.number().int().min(0),
  scoreTeamB: z.number().int().min(0),
  winnerTeam: z.string().nullable().optional(),
  durationSec: z.number().int().min(0),
  players: z.array(playerSchema),
});

export async function POST(request: NextRequest) {
  const providedKey =
    request.headers.get(SYNC_HEADER) ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    null;

  if (!isValidSkinsSyncRequest(providedKey)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await processMatchResultFromGame({
    ...parsed.data,
    winnerTeam: parsed.data.winnerTeam ?? null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.reason ?? "failed" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    sessionId: result.sessionId,
    skipped: result.skipped ?? false,
  });
}
