import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { createAdmin2x2TestRoom } from "@/lib/lobby/match-service";
import { LobbyRoomError } from "@/lib/lobby/rooms-service";
import {
  applyApiGuards,
  jsonError,
  parseJsonBody,
} from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { z } from "zod";
import { firstZodError } from "@/lib/security/schemas";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(64).optional(),
});

export async function POST(request: NextRequest) {
  const guardError = applyApiGuards(
    request,
    "admin-lobby-2x2",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = bodySchema.safeParse(data ?? {});
  if (!parsed.success) return jsonError(400, firstZodError(parsed.error));

  try {
    const room = await createAdmin2x2TestRoom(admin!.id, parsed.data.name);
    await logAdminAction({
      adminId: admin!.id,
      action: "GAME_MODE_ROOM_CREATE",
      targetType: "lobby_room",
      targetId: room.id,
      summary: `Sala 2x2 criada: ${room.name}`,
    });
    return NextResponse.json({
      ok: true,
      message: `Sala ${room.name} criada e visível no lobby.`,
      room: { id: room.id, name: room.name, slots: room.slots },
      lobbyUrl: `/dashboard/lobby/${room.id}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao criar sala 2x2.";
    const status = err instanceof LobbyRoomError ? err.status : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
