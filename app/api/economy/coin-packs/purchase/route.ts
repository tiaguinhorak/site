import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth/session-user";
import { createCoinPackCheckout } from "@/lib/economy/buy-coin-pack";
import { CsgoApiError } from "@/lib/csgo-api/http";
import { applyApiGuards, parseJsonBody } from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { zodErrorResponse } from "@/lib/i18n/api-route";

const bodySchema = z.object({
  packId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "coin-pack-purchase",
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

  const parsed = bodySchema.safeParse(data);
  if (!parsed.success) {
    return zodErrorResponse(request, parsed.error);
  }

  try {
    const result = await createCoinPackCheckout(userId, parsed.data.packId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof CsgoApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Falha ao iniciar compra." }, { status: 500 });
  }
}
