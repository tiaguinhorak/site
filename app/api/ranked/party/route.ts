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
import {
  disbandParty,
  getOrCreatePartyForUser,
  getPartyForUser,
  RankedPartyError,
  updateParty,
} from "@/lib/ranked/party-service";
import { RANKED_REGION_OPTIONS } from "@/lib/ranked/party-shared";
import { RANKED_MAP_POOL } from "@/lib/ranked/constants";
import { getActiveSessionForUser } from "@/lib/ranked/match-session-service";

const teamConfigSchema = z.object({
  name: z.string().max(32).optional(),
  region: z.enum(RANKED_REGION_OPTIONS).optional(),
  visibility: z.enum(["public", "private"]).optional(),
  password: z.string().min(4).max(32).optional(),
  clearPassword: z.boolean().optional(),
  minLevel: z.number().int().min(1).max(20).optional(),
  maxLevel: z.number().int().min(1).max(20).optional(),
  mapPool: z.array(z.enum(RANKED_MAP_POOL)).min(3).optional(),
});

export async function GET(request: NextRequest) {
  const { session, error } = requireSession(request);
  if (error) return error;

  try {
    const party = await getPartyForUser(session!.userId);
    const matchSession = await getActiveSessionForUser(session!.userId);
    return NextResponse.json({ party, session: matchSession });
  } catch (err) {
    return handleApiError(request, err);
  }
}

export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "ranked-party",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error } = requireSession(request);
  if (error) return error;

  const { data } = await parseJsonBody(request);
  let config: z.infer<typeof teamConfigSchema> | undefined;
  if (data && typeof data === "object") {
    const parsed = teamConfigSchema.safeParse(data);
    if (!parsed.success) return jsonError(400, firstZodError(parsed.error));
    config = parsed.data;
  }

  try {
    const party = await getOrCreatePartyForUser(session!.userId, config);
    return NextResponse.json({ party }, { status: 201 });
  } catch (err) {
    return handleApiError(request, err);
  }
}

export async function PATCH(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "ranked-party-update",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error } = requireSession(request);
  if (error) return error;

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = teamConfigSchema.safeParse(data);
  if (!parsed.success) return jsonError(400, firstZodError(parsed.error));

  try {
    const party = await updateParty(session!.userId, parsed.data);
    return NextResponse.json({ party });
  } catch (err) {
    return handleApiError(request, err);
  }
}

export async function DELETE(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "ranked-party-disband",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error } = requireSession(request);
  if (error) return error;

  try {
    await disbandParty(session!.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(request, err);
  }
}
