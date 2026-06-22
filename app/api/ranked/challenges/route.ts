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
import { firstZodError } from "@/lib/security/schemas";
import { z } from "zod";
import {
  listPartyChallenges,
  sendChallenge,
  RankedPartyError,
} from "@/lib/ranked/party-service";

const schema = z.object({ toPartyId: z.string().min(1) });

export async function GET(request: NextRequest) {
  const { session, error } = requireSession(request);
  if (error) return error;

  try {
    const challenges = await listPartyChallenges(session!.userId);
    return NextResponse.json(challenges);
  } catch (err) {
    return handleApiError(request, err);
  }
}

export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "ranked-challenge",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error } = requireSession(request);
  if (error) return error;

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = schema.safeParse(data);
  if (!parsed.success) return jsonError(400, firstZodError(parsed.error));

  try {
    const challenge = await sendChallenge(session!.userId, parsed.data.toPartyId);
    return NextResponse.json({ challenge }, { status: 201 });
  } catch (err) {
    return handleApiError(request, err);
  }
}
