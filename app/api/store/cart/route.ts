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
import {
  addStoreItemToCart,
  getCartSummaryForUser,
} from "@/lib/store/cart-service";
import { processCheckoutDelinquencyForUser } from "@/lib/store/checkout-service";
import { notifyCartAbandoned } from "@/lib/store/cart-notifications";
import { zodErrorResponse } from "@/lib/i18n/api-route";
import { getRequestLocale } from "@/lib/i18n/server";

const addSchema = z.object({
  storeItemId: z.string().min(1),
  quantity: z.number().int().min(1).max(99).optional(),
});

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  await processCheckoutDelinquencyForUser(userId);
  const locale = await getRequestLocale(request);
  const cart = await getCartSummaryForUser(userId, locale);

  const staleMs = 24 * 60 * 60 * 1000;
  if (
    cart.itemCount > 0 &&
    Date.now() - new Date(cart.updatedAt).getTime() > staleMs
  ) {
    await notifyCartAbandoned(userId, cart.itemCount);
  }

  return NextResponse.json({ cart });
}

export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "store-cart-add",
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

  const parsed = addSchema.safeParse(data);
  if (!parsed.success) {
    return zodErrorResponse(request, parsed.error);
  }

  try {
    const cart = await addStoreItemToCart(
      userId,
      parsed.data.storeItemId,
      parsed.data.quantity ?? 1,
    );
    return NextResponse.json({ ok: true, cart });
  } catch (err) {
    const message =
      err instanceof CsgoApiError ? err.message : "Falha ao adicionar ao carrinho.";
    return NextResponse.json(
      { error: message },
      { status: err instanceof CsgoApiError ? err.status : 500 },
    );
  }
}
