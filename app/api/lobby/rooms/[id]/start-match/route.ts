import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyApiGuards,
  jsonError,
  parseJsonBody,
  requireSession,
} from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { startLobbyRoomMatch } from "@/lib/lobby/match-service";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { firstZodError } from "@/lib/security/schemas";
import { handleApiError } from "@/lib/i18n/api-route";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  fillBots: z.boolean().optional(),
});

export async function POST(request: NextRequest, { params }: Params) {
  const guardError = applyApiGuards(
    request,
    "lobby-start-match",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error } = requireSession(request);
  if (error) return error;

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = bodySchema.safeParse(data ?? {});
  if (!parsed.success) return jsonError(400, firstZodError(parsed.error));

  try {
    const { id } = await params;
    const actor = await prisma.user.findUnique({
      where: { id: session!.userId },
      select: { isAdmin: true },
    });

    const matchSession = await startLobbyRoomMatch(id, {
      actorUserId: session!.userId,
      isAdmin: actor?.isAdmin ?? false,
      fillBots: parsed.data.fillBots ?? true,
    });

    return NextResponse.json({
      ok: true,
      message: "Partida iniciada. Votação de mapa aberta para todos na sala.",
      session: matchSession,
    });
  } catch (err) {
    return handleApiError(request, err);
  }
}
