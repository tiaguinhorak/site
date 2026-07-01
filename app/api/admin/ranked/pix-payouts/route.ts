import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { applyApiGuards } from "@/lib/security/api-guard";
import { requireAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { RATE_LIMITS } from "@/lib/security/constants";
import { listAdminPixPayouts } from "@/lib/ranked/pix-payout-service";
import type { RankedSeasonPixPayoutStatus } from "@/lib/generated/prisma/client";

const STATUS_VALUES = ["PENDING", "READY", "CONTACTED", "PAID", "CANCELLED"] as const;

export async function GET(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "admin-ranked-pix-payouts",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { error } = await requireAdmin(request);
  if (error) return error;

  const seasonId = request.nextUrl.searchParams.get("seasonId") ?? undefined;
  const statusParam = request.nextUrl.searchParams.get("status");
  const status =
    statusParam && STATUS_VALUES.includes(statusParam as (typeof STATUS_VALUES)[number])
      ? (statusParam as RankedSeasonPixPayoutStatus)
      : undefined;

  const payouts = await listAdminPixPayouts({ seasonId, status });
  return NextResponse.json({ payouts });
}
