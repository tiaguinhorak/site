import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyApiGuards,
  jsonError,
  parseJsonBody,
} from "@/lib/security/api-guard";
import { getSessionUserId } from "@/lib/auth/session-user";
import { prisma } from "@/lib/prisma";
import { RATE_LIMITS } from "@/lib/security/constants";
import { z } from "zod";
import { jsonErrorKey } from "@/lib/i18n/api-route";

const preferencesSchema = z.object({
  emailNewsletter: z.boolean().optional(),
  inAppMatch: z.boolean().optional(),
  inAppSocial: z.boolean().optional(),
  inAppPromo: z.boolean().optional(),
  inAppSystem: z.boolean().optional(),
  browserPush: z.boolean().optional(),
});

const defaults = {
  emailNewsletter: true,
  inAppMatch: true,
  inAppSocial: true,
  inAppPromo: true,
  inAppSystem: true,
  browserPush: false,
};

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId(request);
  if (!userId) {
    return jsonErrorKey(request, 401, "unauthorized");
  }

  const prefs = await prisma.userNotificationPreferences.findUnique({
    where: { userId },
  });

  return NextResponse.json({ preferences: prefs ?? { userId, ...defaults } });
}

export async function PATCH(request: NextRequest) {
  const guardError = applyApiGuards(
    request,
    "notification-preferences",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const userId = await getSessionUserId(request);
  if (!userId) {
    return jsonErrorKey(request, 401, "unauthorized");
  }

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = preferencesSchema.safeParse(data);
  if (!parsed.success) {
    return jsonErrorKey(request, 400, "invalidData");
  }

  const preferences = await prisma.userNotificationPreferences.upsert({
    where: { userId },
    create: { userId, ...defaults, ...parsed.data },
    update: parsed.data,
  });

  return NextResponse.json({ ok: true, preferences });
}
