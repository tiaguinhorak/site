import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/admin/audit";
import {
  applyApiGuards,
} from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { simulateRankedMatchForAdmin } from "@/lib/ranked/simulate-match";

export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "admin-ranked-simulate",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const result = await simulateRankedMatchForAdmin(admin!.id);

  if (result.ok) {
    await logAdminAction({
      adminId: admin!.id,
      action: "RANKED_SIMULATE",
      targetType: "ranked_session",
      targetId: result.session?.id,
      summary: "Simulou fluxo ranked completo (10 jogadores)",
    });
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
