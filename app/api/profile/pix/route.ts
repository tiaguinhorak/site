import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyApiGuards,
  parseJsonBody,
  requireSession,
} from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { formatZodErrors, firstZodError } from "@/lib/security/schemas";
import { getRequestLocale, apiErrorMessage } from "@/lib/i18n/server";
import { getNamespace } from "@/lib/i18n/catalog";
import { syncUserPixGrantStatuses } from "@/lib/ranked/pix-payout-service";
import {
  getPixProfileForUser,
  savePixProfileForUser,
} from "@/lib/pix/pix-profile-service";
import { pixErrorMessage } from "@/lib/pix/pix-i18n";
import { createPixProfileSchema } from "@/lib/pix/pix-schema";
import {
  parsePixKeyType,
  validateBrazilPhone,
  validatePixKey,
  type PixKeyType,
} from "@/lib/pix/pix-key-utils";

export async function GET(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "profile-pix-read",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error: sessionError } = requireSession(request);
  if (sessionError) return sessionError;

  const locale = await getRequestLocale(request);
  const profile = await getPixProfileForUser(session!.userId);
  if (!profile) {
    return NextResponse.json(
      { error: apiErrorMessage(locale, "userNotFound") },
      { status: 404 },
    );
  }

  return NextResponse.json(profile);
}

export async function PATCH(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "profile-pix-update",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { session, error: sessionError } = requireSession(request);
  if (sessionError) return sessionError;

  const locale = await getRequestLocale(request);
  const pixMessages = getNamespace(locale, "pix");

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = createPixProfileSchema(pixMessages).safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstZodError(parsed.error), fieldErrors: formatZodErrors(parsed.error) },
      { status: 400 },
    );
  }

  const pixKeyType = parsePixKeyType(parsed.data.pixKeyType) as PixKeyType;
  const keyError = validatePixKey(pixKeyType, parsed.data.pixKey);
  if (keyError) {
    return NextResponse.json({ error: pixErrorMessage(locale, keyError) }, { status: 400 });
  }

  const phoneError = validateBrazilPhone(parsed.data.pixContactPhone);
  if (phoneError) {
    return NextResponse.json({ error: pixErrorMessage(locale, phoneError) }, { status: 400 });
  }

  const profile = await savePixProfileForUser(session!.userId, {
    pixKeyType,
    pixKey: parsed.data.pixKey,
    pixKeyHolderName: parsed.data.pixKeyHolderName,
    pixContactEmail: parsed.data.pixContactEmail,
    pixContactPhone: parsed.data.pixContactPhone,
    lgpdConsent: parsed.data.lgpdConsent,
  });

  await syncUserPixGrantStatuses(session!.userId, profile.pixKey);

  return NextResponse.json({ ok: true, ...profile });
}
