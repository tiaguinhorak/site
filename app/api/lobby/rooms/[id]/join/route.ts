import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyApiGuards,
  parseJsonBody,
  requireSession,
} from "@/lib/security/api-guard";
import { handleApiError } from "@/lib/i18n/api-route";
import { RATE_LIMITS } from "@/lib/security/constants";
import { formatZodErrors, firstZodError } from "@/lib/security/schemas";
import { joinLobbyRoomSchema } from "@/lib/lobby/schemas";
import { joinLobbyRoom, LobbyRoomError } from "@/lib/lobby/rooms-service";
import { enrichUserLobbyRoom } from "@/lib/lobby/enrich-user-rooms";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const guardError = await applyApiGuards(
    request,
    "lobby-join",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error } = requireSession(request);
  if (error) return error;

  const { data, error: parseError } = await parseJsonBody(request);
  const body = parseError ? {} : data;
  const parsed = joinLobbyRoomSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstZodError(parsed.error), fieldErrors: formatZodErrors(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const { id } = await params;
    const room = await joinLobbyRoom(id, session!.userId, parsed.data.password);
    return NextResponse.json({ room: enrichUserLobbyRoom(room) });
  } catch (err) {
    return handleApiError(request, err);
  }
}
