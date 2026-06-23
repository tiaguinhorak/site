import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { isValidSkinsSyncRequest } from "@/lib/env/skins-sync";
import { prisma } from "@/lib/prisma";
import { publishMatchLiveToParticipants } from "@/lib/ranked/match-live-notify";

const SYNC_HEADER = "x-skins-sync-key";

const bodySchema = z.object({
  csgoMatchId: z.string().min(1),
  roomId: z.string().min(1),
  scoreTeamA: z.number().int().min(0),
  scoreTeamB: z.number().int().min(0),
  round: z.number().int().min(0),
  phase: z.string().min(1),
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
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const session = await prisma.rankedMatchSession.findFirst({
    where: {
      OR: [{ csgoMatchId: parsed.data.csgoMatchId }, { id: parsed.data.roomId }],
      status: { in: ["starting", "live"] },
    },
    select: { id: true },
  });

  if (!session) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  await prisma.rankedMatchSession.update({
    where: { id: session.id },
    data: {
      scoreTeamA: parsed.data.scoreTeamA,
      scoreTeamB: parsed.data.scoreTeamB,
    },
  });

  void publishMatchLiveToParticipants({
    sessionId: session.id,
    scoreTeamA: parsed.data.scoreTeamA,
    scoreTeamB: parsed.data.scoreTeamB,
    round: parsed.data.round,
    phase: parsed.data.phase,
  });

  return NextResponse.json({ ok: true, sessionId: session.id });
}
