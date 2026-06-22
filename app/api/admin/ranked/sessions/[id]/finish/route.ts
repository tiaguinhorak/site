import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { applyApiGuards, jsonError } from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { adminAbandonRankedSession } from "@/lib/ranked/admin-session";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const guardError = await applyApiGuards(
    request,
    "admin-ranked-session-finish",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await params;
  const result = await adminAbandonRankedSession(id, "finish");
  if (!result.ok) return jsonError(404, result.message);

  await logAdminAction({
    adminId: admin!.id,
    action: "RANKED_SESSION_FINISH",
    targetType: "ranked_session",
    targetId: id,
    summary: "Encerrou sessão ranked (admin)",
  });

  return NextResponse.json(result);
}
