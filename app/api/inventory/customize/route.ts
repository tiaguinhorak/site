import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { CsgoApiError } from "@/lib/csgo-api/http";
import { customizeCatalogSkinForUser } from "@/lib/inventory/customize-skin";
import {
  schedulePushPlayerLoadoutToGameServer,
  type PushLoadoutResult,
} from "@/lib/inventory/push-loadout-to-game-server";
import { invalidateEquippedRowsCache } from "@/lib/inventory/equipped-rows-cache";
import {
  applyApiGuards,
  parseJsonBody,
  requireSession,
} from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { getRequestLocale, apiErrorMessage } from "@/lib/i18n/server";
import { zodErrorResponse } from "@/lib/i18n/api-route";
import { MAX_SKIN_SEED, MIN_SKIN_SEED } from "@/lib/inventory/skin-wear";

const customizeSchema = z.object({
  catalogSkinId: z.string().min(1),
  floatValue: z.number().min(0).max(1).optional(),
  seed: z.number().int().min(MIN_SKIN_SEED).max(MAX_SKIN_SEED).optional(),
  stattrak: z.boolean().optional(),
  nametag: z.string().max(64).nullable().optional(),
});

export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "inventory-customize",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error: sessionError } = requireSession(request);
  if (sessionError) return sessionError;

  const locale = await getRequestLocale(request);
  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = customizeSchema.safeParse(data);
  if (!parsed.success) {
    return zodErrorResponse(request, parsed.error);
  }

  try {
    const result = await customizeCatalogSkinForUser(session!.userId, parsed.data);

    let gameSync: PushLoadoutResult | undefined;
    if (result.steamId) {
      invalidateEquippedRowsCache(result.steamId);
      schedulePushPlayerLoadoutToGameServer(result.steamId);
      gameSync = {
        ok: true,
        applyMode: "staged",
        skinsOk: true,
        stickersOk: true,
        agentsOk: true,
      };
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
