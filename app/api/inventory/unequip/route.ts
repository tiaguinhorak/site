import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth/session-user";
import { CsgoApiError } from "@/lib/csgo-api/http";
import {
  unequipCatalogSkinForUser,
  unequipWeaponForUser,
} from "@/lib/inventory/unequip-catalog-skin";
import { schedulePushLoadoutToGameServer } from "@/lib/inventory/push-loadout-to-game-server";
import {
  applyApiGuards,
  parseJsonBody,
  requireSession,
} from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { getRequestLocale, apiErrorMessage } from "@/lib/i18n/server";
import { zodErrorResponse } from "@/lib/i18n/api-route";

const unequipSchema = z
  .object({
    catalogSkinId: z.string().min(1).optional(),
    weaponId: z.string().min(1).optional(),
  })
  .refine((data) => data.catalogSkinId || data.weaponId, {
    message: "catalogSkinId ou weaponId é obrigatório.",
  });

export async function POST(request: NextRequest) {
  const guardError = applyApiGuards(
    request,
    "inventory-unequip",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error: sessionError } = requireSession(request);
  if (sessionError) return sessionError;

  const locale = await getRequestLocale(request);
  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = unequipSchema.safeParse(data);
  if (!parsed.success) {
    return zodErrorResponse(request, parsed.error);
  }

  try {
    const result = parsed.data.catalogSkinId
      ? await unequipCatalogSkinForUser(session!.userId, parsed.data.catalogSkinId)
      : await unequipWeaponForUser(session!.userId, parsed.data.weaponId!);
    schedulePushLoadoutToGameServer();
    return NextResponse.json(result);
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
