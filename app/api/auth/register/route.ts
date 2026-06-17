import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyApiGuards,
  jsonError,
  parseJsonBody,
} from "@/lib/security/api-guard";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { RATE_LIMITS } from "@/lib/security/constants";
import {
  registerSchema,
  formatZodErrors,
  firstZodError,
} from "@/lib/security/schemas";
import { sessionOptionsFromUser } from "@/lib/auth/session-options";
import { applySessionCookie, createSessionToken } from "@/lib/security/session";

export async function POST(request: NextRequest) {
  const guardError = applyApiGuards(
    request,
    "auth-register",
    RATE_LIMITS.auth.limit,
    RATE_LIMITS.auth.windowMs,
  );
  if (guardError) return guardError;

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = registerSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: firstZodError(parsed.error),
        fieldErrors: formatZodErrors(parsed.error),
      },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return jsonError(409, "Este e-mail já está cadastrado.");
  }

  const nicknameTaken = await prisma.user.findFirst({
    where: { nickname: parsed.data.nickname },
  });
  if (nicknameTaken) {
    return jsonError(409, "Este nickname já está em uso.");
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      passwordHash,
      nickname: parsed.data.nickname,
      firstName: parsed.data.nickname,
    },
  });

  const token = createSessionToken(user.id, sessionOptionsFromUser(user));
  const response = NextResponse.json({
    ok: true,
    user: { nickname: user.nickname, email: user.email },
  });
  return applySessionCookie(response, token, request);
}
