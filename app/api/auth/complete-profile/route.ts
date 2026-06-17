import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyApiGuards,
  jsonError,
  parseJsonBody,
  requireSession,
} from "@/lib/security/api-guard";
import { prisma } from "@/lib/prisma";
import { RATE_LIMITS } from "@/lib/security/constants";
import { formatPhoneBR, sanitizeEmail, sanitizeText } from "@/lib/security/sanitize";
import {
  steamCompleteProfileSchema,
  steamProfileDraftSchema,
  formatZodErrors,
  firstZodError,
} from "@/lib/security/schemas";
import { sessionOptionsFromUser } from "@/lib/auth/session-options";
import {
  applySessionCookie,
  createSessionToken,
} from "@/lib/security/session";
import { steamPersonaToNickname } from "@/lib/steam/nickname";
import { serializeUser } from "@/lib/serializers";

export async function GET(request: NextRequest) {
  const { session, error: sessionError } = requireSession(request);
  if (sessionError) return sessionError;

  const user = await prisma.user.findUnique({
    where: { id: session!.userId },
  });
  if (!user) {
    return jsonError(404, "Usuário não encontrado.");
  }

  if (user.email) {
    return jsonError(400, "Perfil já completado.");
  }

  return NextResponse.json({
    nickname: steamPersonaToNickname(user.steamPersonaName ?? user.nickname),
    storedNickname: user.nickname,
    steamPersonaName: user.steamPersonaName,
    steamId: user.steamId,
    steamProfileUrl: user.steamProfileUrl,
    avatarUrl: user.avatarUrl ?? user.steamAvatarUrl,
    country: user.country,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    email: "",
  });
}

export async function PATCH(request: NextRequest) {
  const guardError = applyApiGuards(
    request,
    "auth-complete-profile-draft",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error: sessionError } = requireSession(request);
  if (sessionError) return sessionError;

  const currentUser = await prisma.user.findUnique({
    where: { id: session!.userId },
  });
  if (!currentUser) {
    return jsonError(404, "Usuário não encontrado.");
  }
  if (currentUser.email) {
    return jsonError(400, "Perfil já completado.");
  }

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = steamProfileDraftSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: firstZodError(parsed.error),
        fieldErrors: formatZodErrors(parsed.error),
      },
      { status: 400 },
    );
  }

  const update: Record<string, string> = {};

  if (parsed.data.firstName !== undefined) {
    update.firstName = sanitizeText(parsed.data.firstName, 64);
  }
  if (parsed.data.lastName !== undefined) {
    update.lastName = sanitizeText(parsed.data.lastName, 64);
  }
  if (parsed.data.phone !== undefined) {
    update.phone = formatPhoneBR(parsed.data.phone);
  }
  if (parsed.data.country !== undefined) {
    update.country = parsed.data.country;
  }

  await prisma.user.update({
    where: { id: session!.userId },
    data: update,
  });

  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  const guardError = applyApiGuards(
    request,
    "auth-complete-profile",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error: sessionError } = requireSession(request);
  if (sessionError) return sessionError;

  const currentUser = await prisma.user.findUnique({
    where: { id: session!.userId },
  });
  if (!currentUser) {
    return jsonError(404, "Usuário não encontrado.");
  }
  if (currentUser.email) {
    return jsonError(400, "Perfil já completado.");
  }

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = steamCompleteProfileSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: firstZodError(parsed.error),
        fieldErrors: formatZodErrors(parsed.error),
      },
      { status: 400 },
    );
  }

  if (parsed.data.website) {
    return jsonError(400, "Requisição inválida.");
  }

  const email = sanitizeEmail(parsed.data.email);

  const emailTaken = await prisma.user.findFirst({
    where: {
      email,
      NOT: { id: session!.userId },
    },
  });
  if (emailTaken) {
    return NextResponse.json(
      {
        error: "Este e-mail já está cadastrado.",
        fieldErrors: { email: "E-mail já cadastrado." },
      },
      { status: 409 },
    );
  }

  const user = await prisma.user.update({
    where: { id: session!.userId },
    data: {
      email,
      firstName: sanitizeText(parsed.data.firstName, 64),
      lastName: sanitizeText(parsed.data.lastName, 64),
      phone: formatPhoneBR(parsed.data.phone),
      country: parsed.data.country,
    },
  });

  const token = createSessionToken(user.id, sessionOptionsFromUser(user));
  const response = NextResponse.json({ ok: true, user: serializeUser(user) });
  return applySessionCookie(response, token, request);
}
