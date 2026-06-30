import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/auth/session-user";
import { applyApiGuards } from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { claimMission, MissionClaimError } from "@/lib/missions/service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guardError = await applyApiGuards(
    request,
    "missions-claim",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const userId = await getSessionUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const result = await claimMission(userId, id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof MissionClaimError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Falha ao resgatar missão." }, { status: 500 });
  }
}
