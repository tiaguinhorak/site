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
import { startCsgoServer } from "@/lib/csgo-api/server-control";
import { afterCsgoServerMutation } from "@/lib/csgo-api/invalidate-caches";

const bodySchema = z.object({
  map: z.string().min(2).max(80),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const guardError = await applyApiGuards(
    request,
    "admin-csgo-server-start",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = bodySchema.safeParse(data);
  if (!parsed.success) return jsonError(400, firstZodError(parsed.error));

  const { id } = await params;
  const result = await startCsgoServer(id, parsed.data.map);
  if (!result.ok) return jsonError(502, result.message);

  await logAdminAction({
    adminId: admin!.id,
    action: "CSGO_SERVER_START",
    targetType: "csgo_server",
    targetId: id,
    summary: `Subiu servidor CS:GO (${parsed.data.map})`,
  });

  await afterCsgoServerMutation();
  return NextResponse.json(result);
}
