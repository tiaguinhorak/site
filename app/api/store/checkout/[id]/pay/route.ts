import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/auth/session-user";
import { applyApiGuards } from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { CsgoApiError } from "@/lib/csgo-api/http";
import { payCheckout } from "@/lib/store/checkout-service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guardError = await applyApiGuards(
    request,
    "store-checkout-pay",
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
    const result = await payCheckout(userId, id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message =
      err instanceof CsgoApiError ? err.message : "Falha ao confirmar pagamento.";
    return NextResponse.json(
      { error: message },
      { status: err instanceof CsgoApiError ? err.status : 500 },
    );
  }
}
