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
import { respondToChallenge, RankedPartyError } from "@/lib/ranked/party-service";

const schema = z.object({ accept: z.boolean() });

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guardError = applyApiGuards(
    request,
    "ranked-challenge-respond",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error } = requireSession(request);
  if (error) return error;

  const { id } = await context.params;
  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = schema.safeParse(data);
  if (!parsed.success) return jsonError(400, firstZodError(parsed.error));

  try {
    const result = await respondToChallenge(session!.userId, id, parsed.data.accept);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(request, err);
  }
}
