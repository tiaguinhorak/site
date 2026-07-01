import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  applyApiGuards,
  parseJsonBody,
  requireSession,
} from "@/lib/security/api-guard";
import { prisma } from "@/lib/prisma";
import { RATE_LIMITS } from "@/lib/security/constants";
import { formatZodErrors, firstZodError } from "@/lib/security/schemas";
import { sanitizeText } from "@/lib/security/sanitize";
import { syncUserPixGrantStatuses } from "@/lib/ranked/pix-payout-service";

const pixSchema = z.object({
  pixKey: z.string().trim().min(3).max(140),
  pixKeyHolderName: z.string().trim().max(80).optional(),
});

export async function GET(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "profile-pix-read",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error: sessionError } = requireSession(request);
  if (sessionError) return sessionError;

  const user = await prisma.user.findUnique({
    where: { id: session!.userId },
    select: { pixKey: true, pixKeyHolderName: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }

  return NextResponse.json({
    pixKey: user.pixKey,
    pixKeyHolderName: user.pixKeyHolderName,
  });
}

export async function PATCH(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "profile-pix-update",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error: sessionError } = requireSession(request);
  if (sessionError) return sessionError;

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = pixSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstZodError(parsed.error), fieldErrors: formatZodErrors(parsed.error) },
      { status: 400 },
    );
  }

  const pixKey = sanitizeText(parsed.data.pixKey, 140);
  const pixKeyHolderName = sanitizeText(parsed.data.pixKeyHolderName ?? "", 80);

  const user = await prisma.user.update({
    where: { id: session!.userId },
    data: { pixKey, pixKeyHolderName },
    select: { pixKey: true, pixKeyHolderName: true },
  });

  await syncUserPixGrantStatuses(session!.userId, pixKey);

  return NextResponse.json({ ok: true, pixKey: user.pixKey, pixKeyHolderName: user.pixKeyHolderName });
}
