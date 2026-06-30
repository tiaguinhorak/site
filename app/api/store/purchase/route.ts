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
import { getStoreItems } from "@/lib/queries";
import { getOwnedCatalogSkinIdsForUser } from "@/lib/inventory/inventory-ownership";
import { purchaseStoreItem, getUserStorePurchaseCounts } from "@/lib/store/fulfill-purchase";
import { serializePublicStoreItem } from "@/lib/store/serialize";
import { zodErrorResponse } from "@/lib/i18n/api-route";

const purchaseSchema = z.object({
  storeItemId: z.string().min(1),
  currency: z.enum(["brl", "coins"]).default("brl"),
});

export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "store-purchase",
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

  const parsed = purchaseSchema.safeParse(data);
  if (!parsed.success) {
    return zodErrorResponse(request, parsed.error);
  }

  try {
    const result = await purchaseStoreItem(userId, parsed.data.storeItemId, {
      currency: parsed.data.currency,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message =
      err instanceof CsgoApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Falha ao processar compra.";
    const status = err instanceof CsgoApiError ? err.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
