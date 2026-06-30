import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/auth/session-user";
import {
  applyApiGuards,
} from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { CsgoApiError } from "@/lib/csgo-api/http";
import { createCheckoutFromCart } from "@/lib/store/checkout-service";

export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "store-checkout",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const userId = await getSessionUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    const result = await createCheckoutFromCart(userId);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message =
      err instanceof CsgoApiError ? err.message : "Falha ao finalizar pedido.";
    return NextResponse.json(
      { error: message },
      { status: err instanceof CsgoApiError ? err.status : 500 },
    );
  }
}
