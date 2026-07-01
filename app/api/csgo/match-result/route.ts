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
  headshots: z.number().int().min(0).optional(),
  damage: z.number().int().min(0).optional(),
  utilityDamage: z.number().int().min(0).optional(),
  enemiesFlashed: z.number().int().min(0).optional(),
  clutchesWon: z.number().int().min(0).optional(),
  entryKills: z.number().int().min(0).optional(),
  awpKills: z.number().int().min(0).optional(),
  weaponKills: z.record(z.string(), z.number().int().min(0)).optional(),
});

const roundSchema = z.object({
  roundNumber: z.number().int().min(1),
  winnerTeam: z.string().nullable().optional(),
  reason: z.string().max(40).nullable().optional(),
  bombPlanted: z.boolean().optional(),
});

const highlightSchema = z.object({
  steamId: z.string().min(5),
  type: z.enum(["ACE", "CLUTCH", "MULTI_KILL", "HEADSHOTS", "ENTRY", "KNIFE"]),
  roundNumber: z.number().int().min(0).optional(),
  detail: z.string().max(120).optional(),
});

const deathSchema = z.object({
  roundNumber: z.number().int().min(0).optional(),
  victimSteamId: z.string().min(5),
  killerSteamId: z.string().min(5).nullable().optional(),
  weapon: z.string().max(40).nullable().optional(),
  headshot: z.boolean().optional(),
  victimTeam: z.string().max(2).nullable().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  z: z.number().optional(),
});

const bodySchema = z.object({
  csgoMatchId: z.string().min(1),
  roomId: z.string().min(1),
  scoreTeamA: z.number().int().min(0),
  scoreTeamB: z.number().int().min(0),
  winnerTeam: z.string().nullable().optional(),
  durationSec: z.number().int().min(0),
  demoUrl: z.string().url().max(500).nullable().optional(),
  players: z.array(playerSchema),
  rounds: z.array(roundSchema).optional(),
  highlights: z.array(highlightSchema).optional(),
  deaths: z.array(deathSchema).optional(),
  replayStale: z.boolean().optional(),
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
