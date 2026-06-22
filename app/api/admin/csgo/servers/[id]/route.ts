import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/admin/audit";
import {
  applyApiGuards,
  jsonError,
} from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { deleteCsgoServer } from "@/lib/csgo-api/server-control";
import { afterCsgoServerMutation } from "@/lib/csgo-api/invalidate-caches";
import { csgoBackendFetch } from "@/lib/csgo-api/client";
import type { CsgoGameServer } from "@/lib/csgo-api/server-types";
import {
  clearAllRankedSessionConnects,
  clearRankedSessionsForEndpoint,
} from "@/lib/ranked/reconcile-server-state";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, { params }: Params) {
  const guardError = await applyApiGuards(
    request,
    "admin-csgo-server-delete",
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
    /* segue com delete */
  }

  const result = await deleteCsgoServer(id);
  if (!result.ok) return jsonError(502, result.message);

  if (host && port) {
    await clearRankedSessionsForEndpoint(host, port);
  } else {
    await clearAllRankedSessionConnects();
  }

  await logAdminAction({
    adminId: admin!.id,
    action: "CSGO_SERVER_DELETE",
    targetType: "csgo_server",
    targetId: id,
    summary: "Removeu registro de servidor CS:GO",
  });

  await afterCsgoServerMutation();
  return NextResponse.json(result);
}
