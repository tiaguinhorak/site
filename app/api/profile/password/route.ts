import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyApiGuards,
  parseJsonBody,
  requireSession,
} from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import {
  passwordChangeSchema,
  formatZodErrors,
  firstZodError,
} from "@/lib/security/schemas";

export async function POST(request: NextRequest) {
  const guardError = applyApiGuards(
    request,
    "profile-password",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { error: sessionError } = requireSession(request);
  if (sessionError) return sessionError;

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = passwordChangeSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: firstZodError(parsed.error),
        fieldErrors: formatZodErrors(parsed.error),
      },
      { status: 400 },
    );
  }

  // Mock — replace with hash verify + hash update in database
  return NextResponse.json({ ok: true });
}
