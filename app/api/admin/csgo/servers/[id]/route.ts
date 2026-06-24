import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/admin/audit";
import {
  applyApiGuards,
  jsonError,
  parseJsonBody,
} from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { firstZodError } from "@/lib/security/schemas";
import { deleteCsgoServer, updateCsgoServerMetadata } from "@/lib/csgo-api/server-control";
import { afterCsgoServerMutation } from "@/lib/csgo-api/invalidate-caches";
import { csgoBackendFetch } from "@/lib/csgo-api/client";
import type { CsgoGameServer } from "@/lib/csgo-api/server-types";
import {
  clearAllRankedSessionConnects,
  clearRankedSessionsForEndpoint,
} from "@/lib/ranked/reconcile-server-state";

const patchSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  pool: z.enum(["ranked", "warmup", "public"]).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const guardError = await applyApiGuards(
    request,
    "admin-csgo-server-patch",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = patchSchema.safeParse(data);
  if (!parsed.success) return jsonError(400, firstZodError(parsed.error));

  const { id } = await params;
  const result = await updateCsgoServerMetadata(id, parsed.data);
  if (!result.ok) return jsonError(502, result.message);

  await logAdminAction({
    adminId: admin!.id,
    action: "CSGO_SERVER_UPDATE",
    targetType: "csgo_server",
    targetId: id,
    summary: `Atualizou servidor CS:GO ${parsed.data.name ?? id}`,
    metadata: { fields: Object.keys(parsed.data) },
  });

  await afterCsgoServerMutation();
  return NextResponse.json(result);
}

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
