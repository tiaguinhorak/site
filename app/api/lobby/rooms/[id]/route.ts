import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyApiGuards,
  jsonError,
  parseJsonBody,
  requireSession,
} from "@/lib/security/api-guard";
import { handleApiError } from "@/lib/i18n/api-route";
import { RATE_LIMITS } from "@/lib/security/constants";
import { formatZodErrors, firstZodError } from "@/lib/security/schemas";
import { readSessionFromCookieHeader } from "@/lib/security/session";
import { updateLobbyRoomSchema } from "@/lib/lobby/schemas";
import {
  closeLobbyRoom,
  getLobbyRoomById,
  LobbyRoomError,
  updateLobbyRoom,
} from "@/lib/lobby/rooms-service";
import { enrichUserLobbyRoom } from "@/lib/lobby/enrich-user-rooms";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = readSessionFromCookieHeader(_request.headers.get("cookie"));
    const room = await getLobbyRoomById(id, session?.userId);
    return NextResponse.json({ room: enrichUserLobbyRoom(room) });
  } catch (err) {
    return handleApiError(_request, err);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const guardError = await applyApiGuards(
    request,
    "lobby-update",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error } = requireSession(request);
  if (error) return error;

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = updateLobbyRoomSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstZodError(parsed.error), fieldErrors: formatZodErrors(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const { id } = await params;
    const room = await updateLobbyRoom(id, session!.userId, parsed.data);
    return NextResponse.json({ room: enrichUserLobbyRoom(room) });
  } catch (err) {
    return handleApiError(request, err);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const guardError = await applyApiGuards(
    request,
    "lobby-close",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error } = requireSession(request);
  if (error) return error;

  try {
    const { id } = await params;
    await closeLobbyRoom(id, session!.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(request, err);
  }
}
