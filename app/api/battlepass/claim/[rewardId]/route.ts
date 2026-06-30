import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/auth/session-user";
import { applyApiGuards } from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { claimBattlePassReward, BattlePassError } from "@/lib/battlepass/service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ rewardId: string }> },
) {
  const guardError = await applyApiGuards(
    request,
    "battlepass-claim",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const userId = await getSessionUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { rewardId } = await context.params;

  try {
    await claimBattlePassReward(userId, rewardId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof BattlePassError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Falha ao resgatar recompensa." }, { status: 500 });
  }
}
