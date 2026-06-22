import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/admin/audit";
import {
  applyApiGuards,
} from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { stopCsgoServer } from "@/lib/csgo-api/server-control";
import { afterCsgoServerMutation } from "@/lib/csgo-api/invalidate-caches";
import { csgoBackendFetch } from "@/lib/csgo-api/client";
import type { CsgoGameServer } from "@/lib/csgo-api/server-types";
import { clearRankedSessionsForEndpoint } from "@/lib/ranked/reconcile-server-state";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const guardError = applyApiGuards(
    request,
    "admin-csgo-server-stop",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await params;

  let host: string | null = null;
  let port: number | null = null;
  try {
    const server = await csgoBackendFetch<CsgoGameServer>(`/api/servers/${id}`);
    host = server.host;
    port = server.port;
  } catch {
    /* ignore */
  }

  const result = await stopCsgoServer(id);

  if (result.ok) {
    if (host && port) {
      await clearRankedSessionsForEndpoint(host, port);
    }
    await logAdminAction({
      adminId: admin!.id,
      action: "CSGO_SERVER_STOP",
      targetType: "csgo_server",
      targetId: id,
      summary: "Derrubou servidor CS:GO",
    });
    await afterCsgoServerMutation();
    return NextResponse.json(result);
  }

  return NextResponse.json(
    {
      error: result.message,
      warning: result.warning,
      orphanProcess: result.orphanProcess ?? false,
    },
    { status: result.orphanProcess ? 409 : 502 },
  );
}
