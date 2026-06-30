import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/auth/session-user";
import { applyApiGuards } from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { joinClan, ClanError } from "@/lib/clans/service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guardError = await applyApiGuards(
    request,
    "clan-join",
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
    const result = await joinClan(userId, id);
    if ("pending" in result) {
      return NextResponse.json({ ok: true, pending: true });
    }
    return NextResponse.json({ ok: true, clan: result });
  } catch (err) {
    if (err instanceof ClanError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Falha ao entrar no clã." }, { status: 500 });
  }
}
