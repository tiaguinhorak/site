import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyApiGuards,
  jsonError,
  parseJsonBody,
} from "@/lib/security/api-guard";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { RATE_LIMITS } from "@/lib/security/constants";
import { logAdminAction } from "@/lib/admin/audit";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guardError = await applyApiGuards(
    request,
    "admin-punishment-revoke",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await context.params;
  const punishment = await prisma.punishment.findUnique({
    where: { id },
    include: { user: { select: { nickname: true } } },
  });
  if (!punishment) {
    return jsonError(404, "Punição não encontrada.");
  }

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const revoke = data?.revoke === true || data?.active === false;
  if (!revoke) {
    return jsonError(400, "Ação inválida.");
  }

  const updated = await prisma.punishment.update({
    where: { id },
    data: {
      active: false,
      revokedAt: new Date(),
      revokedById: admin!.id,
    },
  });

  await logAdminAction({
    adminId: admin!.id,
    action: "PUNISHMENT_REVOKE",
    targetType: "punishment",
    targetId: id,
    summary: `Revogou ${punishment.type} de ${punishment.user.nickname}`,
    metadata: { userId: punishment.userId, type: punishment.type },
  });

  return NextResponse.json({ ok: true, punishment: updated });
}
