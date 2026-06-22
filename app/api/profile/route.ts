import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyApiGuards,
  parseJsonBody,
  requireSession,
} from "@/lib/security/api-guard";
import { getSessionUser } from "@/lib/auth/session-user";
import { prisma } from "@/lib/prisma";
import { RATE_LIMITS } from "@/lib/security/constants";
import { formatPhoneBR } from "@/lib/security/sanitize";
import { formatZodErrors, firstZodError } from "@/lib/security/schemas";
import { createValidationSchemas } from "@/lib/security/schema-factory";
import { getRequestLocale, getValidationMessages, apiErrorMessage } from "@/lib/i18n/server";
import { z } from "zod";
import { serializeUser } from "@/lib/serializers";
import { hasSteamLinked } from "@/lib/auth/steam-access";

export async function GET(request: NextRequest) {
  const locale = await getRequestLocale(request);
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json(
      { error: apiErrorMessage(locale, "unauthorized") },
      { status: 401 },
    );
  }
  return NextResponse.json({ user: serializeUser(user) });
}

export async function PATCH(request: NextRequest) {
  const guardError = applyApiGuards(
    request,
    "profile-update",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error: sessionError } = requireSession(request);
  if (sessionError) return sessionError;

  const locale = await getRequestLocale(request);
  const currentUser = await prisma.user.findUnique({
    where: { id: session!.userId },
  });
  if (!currentUser) {
    return NextResponse.json(
      { error: apiErrorMessage(locale, "userNotFound") },
      { status: 404 },
    );
  }

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const steamLinked = hasSteamLinked(currentUser);
  const schemas = createValidationSchemas(getValidationMessages(locale));
  const schema = steamLinked
    ? schemas.profileUpdateSchema
    : schemas.profileUpdateWithIdentitySchema;
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: schemas.firstZodError(parsed.error),
        fieldErrors: formatZodErrors(parsed.error),
      },
      { status: 400 },
    );
  }

  const updateData: {
    firstName: string;
    lastName: string;
    phone: string;
    country: string;
    bio: string;
    nickname?: string;
    email?: string;
  } = {
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    phone: parsed.data.phone ? formatPhoneBR(parsed.data.phone) : "",
    country: parsed.data.country,
    bio: parsed.data.bio,
  };

  if (!steamLinked && "nickname" in parsed.data && "email" in parsed.data) {
    const identity = parsed.data as z.infer<typeof schemas.profileUpdateWithIdentitySchema>;
    const emailTaken = await prisma.user.findFirst({
      where: {
        email: identity.email,
        NOT: { id: session!.userId },
      },
    });
    if (emailTaken) {
      return NextResponse.json(
        {
          error: apiErrorMessage(locale, "emailInUse"),
          fieldErrors: { email: apiErrorMessage(locale, "emailInUseField") },
        },
        { status: 409 },
      );
    }

    const nicknameTaken = await prisma.user.findFirst({
      where: {
        nickname: identity.nickname,
        NOT: { id: session!.userId },
      },
    });
    if (nicknameTaken) {
      return NextResponse.json(
        {
          error: apiErrorMessage(locale, "nicknameInUse"),
          fieldErrors: { nickname: apiErrorMessage(locale, "nicknameInUseField") },
        },
        { status: 409 },
      );
    }

    updateData.nickname = identity.nickname;
    updateData.email = identity.email;
  }

  const user = await prisma.user.update({
    where: { id: session!.userId },
    data: updateData,
  });

  return NextResponse.json({ ok: true, profile: serializeUser(user) });
}
