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
  validationSchemasForRequest,
  zodErrorResponse,
  apiErrFromRequest,
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

  const emailMsg = apiErrFromRequest(request, "emailAlreadyRegistered");
  const nicknameMsg = apiErrFromRequest(request, "nicknameAlreadyInUse");

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return NextResponse.json(
      { error: emailMsg, fieldErrors: { email: emailMsg } },
      { status: 409 },
    );
  }

  const nicknameTaken = await prisma.user.findFirst({
    where: { nickname: parsed.data.nickname },
  });
  if (nicknameTaken) {
    return NextResponse.json(
      { error: nicknameMsg, fieldErrors: { nickname: nicknameMsg } },
      { status: 409 },
    );
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
