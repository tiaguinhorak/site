import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { CsgoApiError } from "@/lib/csgo-api/http";
import {
  getPlayerWeaponStickers,
  savePlayerWeaponStickers,
} from "@/lib/inventory/player-weapon-stickers";
import { listEnabledStickersForPicker, ensureLegacyStickerCatalogAndLoadouts } from "@/lib/inventory/sticker-catalog-admin";
import { pushPlayerStickersToGameServer } from "@/lib/inventory/push-stickers-to-game-server";
import { getInventoryPlanLimits } from "@/lib/inventory/plan-inventory-access";
import { getSessionUserId } from "@/lib/auth/session-user";
import {
  applyApiGuards,
  parseJsonBody,
} from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { getRequestLocale, apiErrorMessage } from "@/lib/i18n/server";
import { jsonErrorKey, zodErrorResponse } from "@/lib/i18n/api-route";
import type { LoadoutTeam } from "@/lib/inventory/loadout-team";
import { weaponIdToItemDefIndex } from "@/lib/inventory/weapon-defindex";
import {
  effectiveMaxStickerSlots,
  maxStickerSlotsForWeaponId,
  STICKER_SLOT_STORAGE_COUNT,
} from "@/lib/inventory/weapon-sticker-slot-limits";

const saveSchema = z.object({
  weaponId: z.string().min(1),
  team: z.enum(["T", "CT"]),
  slots: z.array(z.number().int().min(0)).length(STICKER_SLOT_STORAGE_COUNT),
});

async function requireUserSteamId(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { steamId: true },
  });
  if (!user) throw new CsgoApiError("Usuário não encontrado.", 404);
  if (!user.steamId) {
    throw new CsgoApiError("Vincule sua Steam no perfil para usar stickers no servidor.", 400);
  }
  return user.steamId;
}

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId(request);
  if (!userId) {
    return jsonErrorKey(request, 401, "unauthorized");
  }

  const params = request.nextUrl.searchParams;
  const picker = params.get("picker") === "1";
  const search = params.get("search") ?? "";

  if (picker) {
    const page = Number(params.get("page") ?? "1");
    const limit = Number(params.get("limit") ?? "24");
    const weaponId = params.get("weaponId")?.trim() ?? "";
    const result = await listEnabledStickersForPicker({
      search,
      page: Number.isFinite(page) ? page : 1,
      limit: Number.isFinite(limit) ? limit : 24,
      weaponId: weaponId || undefined,
    });
    return NextResponse.json(result);
  }

  const weaponId = params.get("weaponId")?.trim() ?? "";
  const team = (params.get("team") ?? "CT") as LoadoutTeam;

  if (!weaponId) {
    return NextResponse.json({ error: "weaponId é obrigatório." }, { status: 400 });
  }
  if (team !== "T" && team !== "CT") {
    return NextResponse.json({ error: "team inválido." }, { status: 400 });
  }

  const locale = await getRequestLocale(request);

  try {
    const steamId = await requireUserSteamId(userId);
    await ensureLegacyStickerCatalogAndLoadouts();
    const limits = await getInventoryPlanLimits(userId);
    const defIndex = await weaponIdToItemDefIndex(weaponId);
    const weaponMaxStickerSlots = maxStickerSlotsForWeaponId(weaponId);
    const effectiveSlots = effectiveMaxStickerSlots(
      weaponId,
      limits.maxStickerSlots,
      defIndex,
    );
    const stickers = await getPlayerWeaponStickers(steamId, weaponId, team, {
      planMax: limits.maxStickerSlots,
    });
    return NextResponse.json({
      weaponId,
      team,
      ...stickers,
      limits: {
        maxStickerSlots: limits.maxStickerSlots,
        weaponMaxStickerSlots,
        effectiveMaxStickerSlots: effectiveSlots,
        canUseStickers: limits.canUseStickers,
        plan: limits.plan,
      },
    });
  } catch (err) {
    if (err instanceof CsgoApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: apiErrorMessage(locale, "internal") },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "inventory-weapon-stickers-save",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const locale = await getRequestLocale(request);
  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const userId = await getSessionUserId(request);
  if (!userId) {
    return jsonErrorKey(request, 401, "unauthorized");
  }

  const parsed = saveSchema.safeParse(data);
  if (!parsed.success) {
    return zodErrorResponse(request, parsed.error);
  }

  try {
    const steamId = await requireUserSteamId(userId);
    const result = await savePlayerWeaponStickers(
      userId,
      steamId,
      parsed.data.weaponId,
      parsed.data.team,
      parsed.data.slots,
    );
    const gameSync = await pushPlayerStickersToGameServer(steamId);
    if (!gameSync.ok) {
      console.warn(
        "[weapon-stickers] game server sticker push failed:",
        gameSync.error ?? "unknown",
      );
    }
    return NextResponse.json({
      ok: true,
      ...result,
      gameSync,
      gameSyncWarning: gameSync.ok
        ? undefined
        : (gameSync.error ??
          "Stickers salvos no site, mas o servidor não recebeu — verifique CSGO_API_URL no .env"),
    });
  } catch (err) {
    if (err instanceof CsgoApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : apiErrorMessage(locale, "internal");
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
