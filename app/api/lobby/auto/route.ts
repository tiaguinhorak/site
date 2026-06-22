import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyApiGuards,
  parseJsonBody,
  requireSession,
} from "@/lib/security/api-guard";
import { handleApiError } from "@/lib/i18n/api-route";
import { RATE_LIMITS } from "@/lib/security/constants";
import { z } from "zod";
import { pickAutoJoinRoom, LobbyRoomError } from "@/lib/lobby/rooms-service";
import { enrichUserLobbyRoom } from "@/lib/lobby/enrich-user-rooms";

const autoSchema = z.object({
  modeId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const guardError = applyApiGuards(
    request,
    "lobby-auto",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error } = requireSession(request);
  if (error) return error;

  const { data } = await parseJsonBody(request);
  const parsed = autoSchema.safeParse(data ?? {});

  try {
    const room = await pickAutoJoinRoom(
      session!.userId,
      parsed.success ? parsed.data.modeId : undefined,
    );
    return NextResponse.json({ room: enrichUserLobbyRoom(room) });
  } catch (err) {
    return handleApiError(request, err);
  }
}
