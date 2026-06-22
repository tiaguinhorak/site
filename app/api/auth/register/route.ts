import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyApiGuards,
  parseJsonBody,
} from "@/lib/security/api-guard";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { RATE_LIMITS } from "@/lib/security/constants";
import { sessionOptionsFromUser } from "@/lib/auth/session-options";
import { applySessionCookie, createSessionToken } from "@/lib/security/session";
import {
  jsonErrorKey,
  validationSchemasForRequest,
  zodErrorResponse,
} from "@/lib/i18n/api-route";

export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "auth-register",
    RATE_LIMITS.auth.limit,
    RATE_LIMITS.auth.windowMs,
  );
  if (guardError) return guardError;

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const schemas = validationSchemasForRequest(request);
  const parsed = schemas.registerSchema.safeParse(data);
  if (!parsed.success) {
    return zodErrorResponse(request, parsed.error);
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return jsonErrorKey(request, 409, "emailAlreadyRegistered");
  }

  const nicknameTaken = await prisma.user.findFirst({
    where: { nickname: parsed.data.nickname },
  });
  if (nicknameTaken) {
    return jsonErrorKey(request, 409, "nicknameAlreadyInUse");
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
