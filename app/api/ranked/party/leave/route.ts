import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyApiGuards,
  requireSession,
} from "@/lib/security/api-guard";
import { handleApiError } from "@/lib/i18n/api-route";
import { RATE_LIMITS } from "@/lib/security/constants";
import { leaveParty, RankedPartyError } from "@/lib/ranked/party-service";

export async function POST(request: NextRequest) {
  const guardError = applyApiGuards(
    request,
    "ranked-party-leave",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error } = requireSession(request);
  if (error) return error;

  try {
    const result = await leaveParty(session!.userId);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(request, err);
  }
}
