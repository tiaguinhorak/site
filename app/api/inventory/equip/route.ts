import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth/session-user";
import { CsgoApiError } from "@/lib/csgo-api/http";
import { equipInventoryItemForUser } from "@/lib/inventory/equip-csgo-skin";
import { equipCatalogSkinForUser } from "@/lib/inventory/equip-catalog-skin";
import { pushPlayerLoadoutToGameServer } from "@/lib/inventory/push-loadout-to-game-server";
import {
  applyApiGuards,
  parseJsonBody,
  requireSession,
} from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { getRequestLocale, apiErrorMessage } from "@/lib/i18n/server";
import { zodErrorResponse } from "@/lib/i18n/api-route";

const equipSchema = z
  .object({
    inventoryItemId: z.string().min(1).optional(),
    catalogSkinId: z.string().min(1).optional(),
  })
  .refine((data) => data.inventoryItemId || data.catalogSkinId, {
    message: "inventoryItemId ou catalogSkinId é obrigatório.",
  });

export async function POST(request: NextRequest) {
  const guardError = applyApiGuards(
    request,
    "inventory-equip",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error: sessionError } = requireSession(request);
  if (sessionError) return sessionError;

  const locale = await getRequestLocale(request);
  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = equipSchema.safeParse(data);
  if (!parsed.success) {
    return zodErrorResponse(request, parsed.error);
  }

  try {
    const result = parsed.data.catalogSkinId
      ? await equipCatalogSkinForUser(session!.userId, parsed.data.catalogSkinId)
      : await equipInventoryItemForUser(session!.userId, parsed.data.inventoryItemId!);

    let gameSync = { ok: true as boolean };
    if (result.steamId) {
      gameSync = await pushPlayerLoadoutToGameServer(result.steamId);
    }

    return NextResponse.json({ ...result, gameSync });
  } catch (err) {
    if (err instanceof CsgoApiError) {
      if (err.message.includes("Steam")) {
        return NextResponse.json(
          { error: apiErrorMessage(locale, "steamNotLinked") },
          { status: err.status },
        );
      }
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: apiErrorMessage(locale, "internal") },
      { status: 500 },
    );
  }
}
