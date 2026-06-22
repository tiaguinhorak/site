import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  applyApiGuards,
  jsonError,
  parseJsonBody,
  requireSession,
} from "@/lib/security/api-guard";
import { handleApiError } from "@/lib/i18n/api-route";
import { RATE_LIMITS } from "@/lib/security/constants";
import { firstZodError } from "@/lib/security/schemas";
import { joinPartyById, RankedPartyError } from "@/lib/ranked/party-service";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({ password: z.string().max(32).optional() });

export async function POST(request: NextRequest, { params }: Params) {
  const guardError = applyApiGuards(
    request,
    "ranked-room-join",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error } = requireSession(request);
  if (error) return error;

  const { data } = await parseJsonBody(request);
  let password: string | undefined;
  if (data && typeof data === "object") {
    const parsed = schema.safeParse(data);
    if (!parsed.success) return jsonError(400, firstZodError(parsed.error));
    password = parsed.data.password;
  }

  try {
    const { id } = await params;
    const party = await joinPartyById(session!.userId, id, password);
    return NextResponse.json({ party });
  } catch (err) {
    return handleApiError(request, err);
  }
}
