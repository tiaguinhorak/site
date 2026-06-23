import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { CsgoApiError } from "@/lib/csgo-api/http";
import {
  getPlayerWeaponStickers,
  savePlayerWeaponStickers,
} from "@/lib/inventory/player-weapon-stickers";
import { listEnabledStickersForPicker } from "@/lib/inventory/sticker-catalog-admin";
import { pushPlayerStickersToGameServer } from "@/lib/inventory/push-stickers-to-game-server";
import {
  applyApiGuards,
  parseJsonBody,
  requireSession,
} from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { getRequestLocale, apiErrorMessage } from "@/lib/i18n/server";
import { zodErrorResponse } from "@/lib/i18n/api-route";
import type { LoadoutTeam } from "@/lib/inventory/loadout-team";

const saveSchema = z.object({
  weaponId: z.string().min(1),
  team: z.enum(["T", "CT"]),
  slots: z.array(z.number().int().min(0)).max(5),
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
  const guardError = await applyApiGuards(
    request,
    "inventory-weapon-stickers",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error: sessionError } = requireSession(request);
  if (sessionError) return sessionError;

  const params = request.nextUrl.searchParams;
  const picker = params.get("picker") === "1";
  const search = params.get("search") ?? "";

  if (picker) {
    const limit = Number(params.get("limit") ?? "60");
    const items = await listEnabledStickersForPicker(
      search,
      Number.isFinite(limit) ? limit : 60,
    );
    return NextResponse.json({ items });
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
    const steamId = await requireUserSteamId(session!.userId);
    const stickers = await getPlayerWeaponStickers(steamId, weaponId, team);
    return NextResponse.json({ weaponId, team, ...stickers });
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

  const { session, error: sessionError } = requireSession(request);
  if (sessionError) return sessionError;

  const locale = await getRequestLocale(request);
  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = saveSchema.safeParse(data);
  if (!parsed.success) {
    return zodErrorResponse(request, parsed.error);
  }

  try {
    const steamId = await requireUserSteamId(session!.userId);
    const result = await savePlayerWeaponStickers(
      steamId,
      parsed.data.weaponId,
      parsed.data.team,
      parsed.data.slots,
    );
    const gameSync = await pushPlayerStickersToGameServer(steamId);
    return NextResponse.json({ ok: true, ...result, gameSync });
  } catch (err) {
    if (err instanceof CsgoApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : apiErrorMessage(locale, "internal");
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
