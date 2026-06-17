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
import {
  profileUpdateSchema,
  profileUpdateWithIdentitySchema,
  formatZodErrors,
  firstZodError,
} from "@/lib/security/schemas";
import { z } from "zod";
import { serializeUser } from "@/lib/serializers";
import { hasSteamLinked } from "@/lib/auth/steam-access";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
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

  const currentUser = await prisma.user.findUnique({
    where: { id: session!.userId },
  });
  if (!currentUser) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const steamLinked = hasSteamLinked(currentUser);
  const schema = steamLinked ? profileUpdateSchema : profileUpdateWithIdentitySchema;
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: firstZodError(parsed.error),
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
    const identity = parsed.data as z.infer<typeof profileUpdateWithIdentitySchema>;
    const emailTaken = await prisma.user.findFirst({
      where: {
        email: identity.email,
        NOT: { id: session!.userId },
      },
    });
    if (emailTaken) {
      return NextResponse.json(
        {
          error: "Este e-mail já está em uso.",
          fieldErrors: { email: "E-mail já cadastrado." },
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
          error: "Nickname em uso.",
          fieldErrors: { nickname: "Nickname já em uso." },
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
