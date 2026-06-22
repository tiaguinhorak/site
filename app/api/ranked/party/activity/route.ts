import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/security/api-guard";
import { handleApiError } from "@/lib/i18n/api-route";
import { getPartyActivitiesForUser } from "@/lib/ranked/party-activity";
import { RankedPartyError } from "@/lib/ranked/party-service";

export async function GET(request: NextRequest) {
  const { session, error } = requireSession(request);
  if (error) return error;

  try {
    const activities = await getPartyActivitiesForUser(session!.userId);
    return NextResponse.json({ activities });
  } catch (err) {
    return handleApiError(request, err);
  }
}
