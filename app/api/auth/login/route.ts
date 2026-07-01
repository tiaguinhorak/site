import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyApiGuards,
  parseJsonBody,
} from "@/lib/security/api-guard";
import { sanitizeNickname } from "@/lib/security/sanitize";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { RATE_LIMITS } from "@/lib/security/constants";
import { formatZodErrors } from "@/lib/security/schemas";
import { sessionOptionsFromUser } from "@/lib/auth/session-options";
import { createSessionToken, applySessionCookie } from "@/lib/security/session";
import { isUserBanned } from "@/lib/admin/punishments";
import { recordAccountFingerprint } from "@/lib/anti-smurf/fingerprint";
import { refreshSmurfProfile } from "@/lib/anti-smurf/service";
import {
  jsonErrorKey,
  validationSchemasForRequest,
  zodErrorResponse,
} from "@/lib/i18n/api-route";

export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "auth-login",
    RATE_LIMITS.auth.limit,
    RATE_LIMITS.auth.windowMs,
  );
  if (guardError) return guardError;

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const schemas = validationSchemasForRequest(request);
  const parsed = schemas.loginSchema.safeParse(data);
  if (!parsed.success) {
    return zodErrorResponse(request, parsed.error);
  }

  const user = await prisma.user.findFirst({
    where: { nickname: sanitizeNickname(parsed.data.nickname) },
  });

  if (!user?.passwordHash) {
    return jsonErrorKey(request, 401, "invalidCredentials");
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    return jsonErrorKey(request, 401, "invalidCredentials");
  }

  if (await isUserBanned(user.id)) {
    return jsonErrorKey(request, 403, "accountSuspended");
  }

  const token = createSessionToken(user.id, sessionOptionsFromUser(user));
  const response = NextResponse.json({ ok: true });
  void recordAccountFingerprint(user.id, request).then(() => refreshSmurfProfile(user.id));
  return applySessionCookie(response, token, request);
}
