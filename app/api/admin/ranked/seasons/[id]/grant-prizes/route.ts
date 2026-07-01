import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { applyApiGuards } from "@/lib/security/api-guard";
import { requireAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { RATE_LIMITS } from "@/lib/security/constants";
import { grantSeasonPrizes, RankedSeasonError } from "@/lib/ranked/season-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const guardError = await applyApiGuards(
    request,
    "admin-ranked-season-grant",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await context.params;

  try {
    const result = await grantSeasonPrizes(id, admin!.id);

    await logAdminAction({
      adminId: admin!.id,
      action: "RANKED_SEASON_GRANT_PRIZES",
      targetType: "ranked_season",
      targetId: id,
      summary: "Concedeu premiações do top 3",
      metadata: { results: result.results },
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof RankedSeasonError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
