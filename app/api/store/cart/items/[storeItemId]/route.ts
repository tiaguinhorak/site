import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth/session-user";
import {
  applyApiGuards,
  parseJsonBody,
} from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { CsgoApiError } from "@/lib/csgo-api/http";
import { updateCartItemQuantity } from "@/lib/store/cart-service";
import { zodErrorResponse } from "@/lib/i18n/api-route";

const patchSchema = z.object({
  quantity: z.number().int().min(0).max(99),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ storeItemId: string }> },
) {
  const guardError = await applyApiGuards(
    request,
    "store-cart-update",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const userId = await getSessionUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { storeItemId } = await context.params;
  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = patchSchema.safeParse(data);
  if (!parsed.success) {
    return zodErrorResponse(request, parsed.error);
  }

  try {
    const cart = await updateCartItemQuantity(userId, storeItemId, parsed.data.quantity);
    return NextResponse.json({ ok: true, cart });
  } catch (err) {
    const message =
      err instanceof CsgoApiError ? err.message : "Falha ao atualizar carrinho.";
    return NextResponse.json(
      { error: message },
      { status: err instanceof CsgoApiError ? err.status : 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ storeItemId: string }> },
) {
  const guardError = await applyApiGuards(
    request,
    "store-cart-remove",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const userId = await getSessionUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { storeItemId } = await context.params;

  try {
    const cart = await updateCartItemQuantity(userId, storeItemId, 0);
    return NextResponse.json({ ok: true, cart });
  } catch (err) {
    const message =
      err instanceof CsgoApiError ? err.message : "Falha ao remover item.";
    return NextResponse.json(
      { error: message },
      { status: err instanceof CsgoApiError ? err.status : 500 },
    );
  }
}
