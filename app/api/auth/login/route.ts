import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyApiGuards,
  jsonError,
  parseJsonBody,
} from "@/lib/security/api-guard";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { RATE_LIMITS } from "@/lib/security/constants";
import {
  loginSchema,
  registerSchema,
  formatZodErrors,
  firstZodError,
} from "@/lib/security/schemas";
import { sessionOptionsFromUser } from "@/lib/auth/session-options";
import { createSessionToken, applySessionCookie } from "@/lib/security/session";

import { isUserBanned } from "@/lib/admin/punishments";

export async function POST(request: NextRequest) {
  const guardError = applyApiGuards(
    request,
    "auth-login",
    RATE_LIMITS.auth.limit,
    RATE_LIMITS.auth.windowMs,
  );
  if (guardError) return guardError;

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = loginSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: firstZodError(parsed.error),
        fieldErrors: formatZodErrors(parsed.error),
      },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (!user?.passwordHash) {
    return jsonError(401, "E-mail ou senha incorretos.");
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    return jsonError(401, "E-mail ou senha incorretos.");
  }

  if (await isUserBanned(user.id)) {
    return jsonError(403, "Conta suspensa. Entre em contato com o suporte.");
  }

  const token = createSessionToken(user.id, sessionOptionsFromUser(user));
  const response = NextResponse.json({ ok: true });
  return applySessionCookie(response, token, request);
}
