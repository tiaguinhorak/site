import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  applyApiGuards,
  jsonError,
  parseJsonBody,
} from "@/lib/security/api-guard";
import { requireAdmin } from "@/lib/auth/admin";
import { RATE_LIMITS } from "@/lib/security/constants";
import { firstZodError } from "@/lib/security/schemas";
import { logAdminAction } from "@/lib/admin/audit";
import { hasSteamApiKey } from "@/lib/steam/api-key";
import {
  refreshAllLinkedSteamProfiles,
  refreshSteamProfileForUserId,
} from "@/lib/steam/sync-profiles";

const bodySchema = z.object({
  userId: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(500).optional(),
});

export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "admin-steam-sync-profiles",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  if (!hasSteamApiKey()) {
    return jsonError(503, "STEAM_API_KEY não configurada no servidor.");
  }

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = bodySchema.safeParse(data ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });
  }

  if (parsed.data.userId) {
    const ok = await refreshSteamProfileForUserId(parsed.data.userId);
    if (!ok) {
      return jsonError(404, "Não foi possível atualizar o perfil Steam deste usuário.");
    }

    await logAdminAction({
      adminId: admin!.id,
      action: "STEAM_PROFILE_SYNC",
      targetType: "user",
      targetId: parsed.data.userId,
      summary: "Sincronizou perfil Steam de um usuário",
    });

    return NextResponse.json({ ok: true, updated: 1 });
  }

  const result = await refreshAllLinkedSteamProfiles({ limit: parsed.data.limit ?? 500 });

  await logAdminAction({
    adminId: admin!.id,
    action: "STEAM_PROFILE_SYNC",
    targetType: "system",
    summary: `Sincronizou perfis Steam (${result.updated}/${result.total})`,
    metadata: result,
  });

  return NextResponse.json({ ok: true, ...result });
}
