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
import { adminGameModeRoomUpdateSchema } from "@/lib/admin/schemas";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guardError = applyApiGuards(
    request,
    "admin-game-mode-room-update",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await context.params;
  const existing = await prisma.gameModeRoom.findUnique({
    where: { id },
    include: { gameMode: true },
  });
  if (!existing) return jsonError(404, "Sala não encontrada.");

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = adminGameModeRoomUpdateSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstZodError(parsed.error), fieldErrors: formatZodErrors(parsed.error) },
      { status: 400 },
    );
  }

  const room = await prisma.gameModeRoom.update({
    where: { id },
    data: parsed.data,
  });

  await logAdminAction({
    adminId: admin!.id,
    action: "GAME_MODE_ROOM_UPDATE",
    targetType: "game_mode_room",
    targetId: id,
    summary: `Atualizou sala ${room.name} (${existing.gameMode.name})`,
  });

  return NextResponse.json({ ok: true, room });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guardError = applyApiGuards(
    request,
    "admin-game-mode-room-delete",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await context.params;
  const existing = await prisma.gameModeRoom.findUnique({
    where: { id },
    include: { gameMode: true },
  });
  if (!existing) return jsonError(404, "Sala não encontrada.");

  await prisma.gameModeRoom.delete({ where: { id } });

  await logAdminAction({
    adminId: admin!.id,
    action: "GAME_MODE_ROOM_DELETE",
    targetType: "game_mode_room",
    targetId: id,
    summary: `Removeu sala ${existing.name} (${existing.gameMode.name})`,
  });

  return NextResponse.json({ ok: true });
}
