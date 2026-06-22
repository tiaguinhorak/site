import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { ensureDefaultCsgoServerRegistered } from "@/lib/csgo-api/bootstrap-default-server";
import { describeMissingCsgoServerEnv } from "@/lib/csgo-api/config";
import {
  applyApiGuards,
  jsonError,
} from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";

export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "admin-csgo-server-bootstrap",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const result = await ensureDefaultCsgoServerRegistered();
  if (!result.ok) {
    const hint = describeMissingCsgoServerEnv();
    return jsonError(400, hint ? `${result.message} ${hint}` : result.message);
  }

  if (result.registered && result.server) {
    await logAdminAction({
      adminId: admin!.id,
      action: "CSGO_SERVER_REGISTER",
      targetType: "csgo_server",
      targetId: result.server.id,
      summary: `Bootstrap automático: ${result.server.name}`,
    });
  }

  return NextResponse.json(result);
}

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const missingEnv = describeMissingCsgoServerEnv();
  return NextResponse.json({
    canBootstrap: missingEnv === "",
    missingEnv: missingEnv || null,
  });
}
