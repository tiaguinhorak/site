import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyApiGuards,
  jsonError,
} from "@/lib/security/api-guard";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { RATE_LIMITS } from "@/lib/security/constants";
import { logAdminAction } from "@/lib/admin/audit";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guardError = applyApiGuards(
    request,
    "admin-steam-unlink",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await context.params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return jsonError(404, "Usuário não encontrado.");
  }

  if (!target.steamId) {
    return jsonError(400, "Usuário não tem Steam vinculada.");
  }

  await prisma.user.update({
    where: { id },
    data: {
      steamId: null,
      steamPersonaName: null,
      steamAvatarUrl: null,
      steamProfileUrl: null,
      steamCountryCode: null,
    },
  });

  await logAdminAction({
    adminId: admin!.id,
    action: "USER_STEAM_UNLINK",
    targetType: "user",
    targetId: id,
    summary: `Desvinculou Steam de ${target.nickname}`,
    metadata: { steamId: target.steamId },
  });

  return NextResponse.json({ ok: true });
}
