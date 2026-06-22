import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readSessionFromCookieHeader } from "@/lib/security/session";
import { listActiveLobbyRooms } from "@/lib/lobby/rooms-service";
import { enrichUserLobbyRooms } from "@/lib/lobby/enrich-user-rooms";
import { handleApiError } from "@/lib/i18n/api-route";

export async function GET(request: NextRequest) {
  try {
    const session = readSessionFromCookieHeader(request.headers.get("cookie"));
    const rooms = await listActiveLobbyRooms(session?.userId);
    return NextResponse.json({ rooms: enrichUserLobbyRooms(rooms) });
  } catch (err) {
    return handleApiError(request, err);
  }
}
