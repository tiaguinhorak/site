import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/security/api-guard";
import { handleApiError } from "@/lib/i18n/api-route";
import {
  listChallengeableParties,
  listPartyChallenges,
  RankedPartyError,
} from "@/lib/ranked/party-service";

export async function GET(request: NextRequest) {
  const { session, error } = requireSession(request);
  if (error) return error;

  try {
    const [parties, challenges] = await Promise.all([
      listChallengeableParties(session!.userId),
      listPartyChallenges(session!.userId),
    ]);
    return NextResponse.json({ parties, challenges });
  } catch (err) {
    return handleApiError(request, err);
  }
}
