import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/auth/session-user";
import { applyApiGuards } from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { purchaseBattlePassPremium, BattlePassError } from "@/lib/battlepass/service";

export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "battlepass-premium",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const userId = await getSessionUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    await purchaseBattlePassPremium(userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof BattlePassError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Falha ao adquirir passe premium." }, { status: 500 });
  }
}
