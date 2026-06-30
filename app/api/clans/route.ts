import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth/session-user";
import { applyApiGuards, parseJsonBody } from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { zodErrorResponse } from "@/lib/i18n/api-route";
import {
  createClan,
  listClanRanking,
  getUserClanDetail,
  ClanError,
} from "@/lib/clans/service";

const createSchema = z.object({
  tag: z.string().min(2).max(6),
  name: z.string().min(3).max(24),
  description: z.string().max(500).optional(),
  joinMode: z.enum(["OPEN", "CLOSED"]).optional(),
});

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId(request);
  const [ranking, myClan] = await Promise.all([
    listClanRanking(50),
    userId ? getUserClanDetail(userId) : Promise.resolve(null),
  ]);
  return NextResponse.json({ ranking, myClan });
}

export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "clan-create",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const userId = await getSessionUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = createSchema.safeParse(data);
  if (!parsed.success) {
    return zodErrorResponse(request, parsed.error);
  }

  try {
    const clan = await createClan(userId, parsed.data);
    return NextResponse.json({ ok: true, clan });
  } catch (err) {
    if (err instanceof ClanError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Falha ao criar clã." }, { status: 500 });
  }
}
