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
import {
  formatZodErrors,
  firstZodError,
} from "@/lib/security/schemas";
import { logAdminAction } from "@/lib/admin/audit";
import { adminPunishmentCreateSchema } from "@/lib/admin/schemas";
import { listActivePunishmentsForUser } from "@/lib/admin/punishments";
import { syncGameBanForPunishment, syncGameUnbanForUser } from "@/lib/admin/punishment-server-sync";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await context.params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return jsonError(404, "Usuário não encontrado.");
  }

  const punishments = await listActivePunishmentsForUser(id);
  return NextResponse.json({ punishments });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guardError = await applyApiGuards(
    request,
    "admin-punishment-create",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { id: routeUserId } = await context.params;
  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = adminPunishmentCreateSchema.safeParse({
    ...data,
    userId: routeUserId,
  });
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: firstZodError(parsed.error),
        fieldErrors: formatZodErrors(parsed.error),
      },
      { status: 400 },
    );
  }

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
  });
  if (!target) {
    return jsonError(404, "Usuário não encontrado.");
  }

  if (parsed.data.type === "BAN" && target.id === admin!.id) {
    return jsonError(400, "Você não pode banir sua própria conta.");
  }

  let expiresAt: Date | null = null;
  if (parsed.data.expiresAt) {
    expiresAt = new Date(parsed.data.expiresAt);
  } else if (parsed.data.durationDays) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parsed.data.durationDays);
  }

  const punishment = await prisma.punishment.create({
    data: {
      userId: parsed.data.userId,
      adminId: admin!.id,
      type: parsed.data.type,
      scope: parsed.data.scope,
      serverName: parsed.data.serverName ?? "",
      reason: parsed.data.reason,
      notes: parsed.data.notes ?? "",
      expiresAt,
    },
    include: {
      admin: { select: { nickname: true } },
      user: { select: { nickname: true } },
    },
  });

  await logAdminAction({
    adminId: admin!.id,
    action: "PUNISHMENT_CREATE",
    targetType: "punishment",
    targetId: punishment.id,
    summary: `Aplicou ${parsed.data.type} a ${target.nickname}`,
    metadata: { userId: target.id, type: parsed.data.type, reason: parsed.data.reason },
  });

  let serverSync: { attempted: boolean; ok: boolean; error?: string } | null = null;
  if (parsed.data.type === "BAN") {
    serverSync = await syncGameBanForPunishment({
      userId: target.id,
      reason: parsed.data.reason,
      expiresAt,
    });
  }

  return NextResponse.json({ ok: true, punishment, serverSync });
}
