import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyApiGuards,
  parseJsonBody,
  requireSession,
} from "@/lib/security/api-guard";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { RATE_LIMITS } from "@/lib/security/constants";
import { formatPhoneBR, sanitizeEmail, sanitizeText } from "@/lib/security/sanitize";
import { sessionOptionsFromUser } from "@/lib/auth/session-options";
import {
  applySessionCookie,
  createSessionToken,
} from "@/lib/security/session";
import { steamPersonaToNickname } from "@/lib/steam/nickname";
import { serializeUser } from "@/lib/serializers";
import {
  jsonErrorKey,
  validationSchemasForRequest,
  zodErrorResponse,
  apiErrFromRequest,
} from "@/lib/i18n/api-route";

export async function GET(request: NextRequest) {
  const { session, error: sessionError } = requireSession(request);
  if (sessionError) return sessionError;

  const user = await prisma.user.findUnique({
    where: { id: session!.userId },
  });
  if (!user) {
    return jsonErrorKey(request, 404, "userNotFound");
  }

  if (user.email) {
    return jsonErrorKey(request, 400, "profileAlreadyComplete");
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
  const guardError = await applyApiGuards(
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
    return jsonErrorKey(request, 404, "userNotFound");
  }
  if (currentUser.email) {
    return jsonErrorKey(request, 400, "profileAlreadyComplete");
  }

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const schemas = validationSchemasForRequest(request);
  const parsed = schemas.steamProfileDraftSchema.safeParse(data);
  if (!parsed.success) {
    return zodErrorResponse(request, parsed.error);
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
  const guardError = await applyApiGuards(
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
    return jsonErrorKey(request, 404, "userNotFound");
  }
  if (currentUser.email) {
    return jsonErrorKey(request, 400, "profileAlreadyComplete");
  }

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const schemas = validationSchemasForRequest(request);
  const parsed = schemas.steamCompleteProfileSchema.safeParse(data);
  if (!parsed.success) {
    return zodErrorResponse(request, parsed.error);
  }

  if (parsed.data.website) {
    return jsonErrorKey(request, 400, "invalidRequest");
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
        error: apiErrFromRequest(request, "emailAlreadyRegistered"),
        fieldErrors: { email: apiErrFromRequest(request, "emailInUseField") },
      },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const user = await prisma.user.update({
    where: { id: session!.userId },
    data: {
      email,
      passwordHash,
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
