import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/security/api-guard";
import { handleApiError } from "@/lib/i18n/api-route";
import { listRankedRooms, RankedPartyError } from "@/lib/ranked/party-service";

export async function GET(request: NextRequest) {
  const { session, error } = requireSession(request);
  if (error) return error;

  try {
    const data = await listRankedRooms(session!.userId);
    return NextResponse.json(data);
  } catch (err) {
    return handleApiError(request, err);
  }
}
