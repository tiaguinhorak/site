import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import {
  createAnticheatReviewCase,
  listAnticheatReviewCases,
} from "@/lib/anticheat/review-case-service";
import type { AnticheatReviewStatus } from "@/lib/generated/prisma/client";
import { applyApiGuards, parseJsonBody } from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { firstZodError } from "@/lib/security/schemas";

const createSchema = z.object({
  steamId: z.string().trim().min(3).max(32).optional(),
  nickname: z.string().trim().max(64).optional(),
  userId: z.string().optional(),
  matchId: z.string().trim().max(128).optional(),
  demoUrl: z.string().url().optional(),
  reason: z.string().trim().min(5).max(500),
  severity: z.number().int().min(1).max(5).optional(),
});

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const statusParam = request.nextUrl.searchParams.get("status");
  const status =
    statusParam === "PENDING" ||
    statusParam === "UNDER_REVIEW" ||
    statusParam === "CLEARED" ||
    statusParam === "CONFIRMED" ||
    statusParam === "DISMISSED"
      ? (statusParam as AnticheatReviewStatus)
      : undefined;

  const cases = await listAnticheatReviewCases({ status });
  return NextResponse.json({ cases });
}

export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "admin-var-ac-create",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { error } = await requireAdmin(request);
  if (error) return error;

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = createSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });
  }

  const created = await createAnticheatReviewCase(parsed.data);
  return NextResponse.json({ ok: true, case: created });
}
