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
import { adminGameModeRoomCreateSchema } from "@/lib/admin/schemas";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guardError = applyApiGuards(
    request,
    "admin-game-mode-room-create",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { id: gameModeId } = await context.params;
  const mode = await prisma.gameMode.findUnique({ where: { id: gameModeId } });
  if (!mode) return jsonError(404, "Modo não encontrado.");

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = adminGameModeRoomCreateSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstZodError(parsed.error), fieldErrors: formatZodErrors(parsed.error) },
      { status: 400 },
    );
  }

  const room = await prisma.gameModeRoom.create({
    data: { ...parsed.data, gameModeId },
  });

  await logAdminAction({
    adminId: admin!.id,
    action: "GAME_MODE_ROOM_CREATE",
    targetType: "game_mode_room",
    targetId: room.id,
    summary: `Adicionou sala ${room.name} em ${mode.name}`,
  });

  return NextResponse.json({ ok: true, room });
}
