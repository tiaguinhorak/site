import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { applyApiGuards } from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { reconcileAllStaleRankedSessions } from "@/lib/ranked/reconcile-stale-sessions";

export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "admin-ranked-cleanup",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const cleared = await reconcileAllStaleRankedSessions();

  await logAdminAction({
    adminId: admin!.id,
    action: "RANKED_STALE_CLEANUP",
    targetType: "ranked_session",
    targetId: "global",
    summary: `Limpou ${cleared} sessão(ões) ranked / salas presas`,
  });

  return NextResponse.json({
    ok: true,
    message: `Limpeza concluída. ${cleared} item(ns) reconciliado(s).`,
    cleared,
  });
}
