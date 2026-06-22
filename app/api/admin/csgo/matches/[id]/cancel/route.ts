import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/admin/audit";
import {
  applyApiGuards,
  jsonError,
} from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { cancelCsgoMatch } from "@/lib/csgo-api/server-control";
import { afterCsgoMatchMutation } from "@/lib/csgo-api/invalidate-caches";
import { abandonRankedSessionsForCsgoMatch } from "@/lib/ranked/reconcile-stale-sessions";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const guardError = applyApiGuards(
    request,
    "admin-csgo-match-cancel",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await params;
  const result = await cancelCsgoMatch(id);
  if (!result.ok) return jsonError(502, result.message);

  await abandonRankedSessionsForCsgoMatch(id, "cancel");

  await logAdminAction({
    adminId: admin!.id,
    action: "CSGO_MATCH_CANCEL",
    targetType: "csgo_match",
    targetId: id,
    summary: "Cancelou partida CS:GO",
  });

  afterCsgoMatchMutation();
  return NextResponse.json(result);
}
