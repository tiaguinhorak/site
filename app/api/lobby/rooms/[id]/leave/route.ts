import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyApiGuards,
  requireSession,
} from "@/lib/security/api-guard";
import { handleApiError } from "@/lib/i18n/api-route";
import { RATE_LIMITS } from "@/lib/security/constants";
import { leaveLobbyRoom, LobbyRoomError } from "@/lib/lobby/rooms-service";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const guardError = await applyApiGuards(
    request,
    "lobby-leave",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error } = requireSession(request);
  if (error) return error;

  try {
    const { id } = await params;
    const result = await leaveLobbyRoom(id, session!.userId);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(request, err);
  }
}
