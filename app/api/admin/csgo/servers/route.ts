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
import { registerCsgoServer, registerAndStartCsgoServer } from "@/lib/csgo-api/server-control";
import { afterCsgoServerMutation } from "@/lib/csgo-api/invalidate-caches";
import { listAllCsgoApiServers } from "@/lib/csgo-api/client";

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  host: z.string().min(3).max(120),
  port: z.number().int().min(1).max(65535),
  rconPort: z.number().int().min(1).max(65535),
  rconPassword: z.string().min(1).max(120),
  csgoDir: z.string().min(1).max(200),
  tickrate: z.number().int().min(64).max(128).optional(),
  pool: z.enum(["ranked", "warmup", "public"]).optional(),
  autoStart: z.boolean().optional(),
  map: z.string().min(2).max(80).optional(),
});

export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "admin-csgo-server-register",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = registerSchema.safeParse(data);
  if (!parsed.success) return jsonError(400, firstZodError(parsed.error));

  const existing = await listAllCsgoApiServers();
  const portTaken = existing.find((s) => s.port === parsed.data.port);
  if (portTaken) {
    return jsonError(
      409,
      `A porta ${parsed.data.port} já está em uso por "${portTaken.name}". Escolha outra porta ou remova o servidor existente.`,
    );
  }
  const rconTaken = existing.find((s) => (s.rconPort ?? s.port) === parsed.data.rconPort);
  if (rconTaken) {
    return jsonError(
      409,
      `A porta RCON ${parsed.data.rconPort} já está em uso por "${rconTaken.name}".`,
    );
  }

  const result = parsed.data.autoStart
    ? await registerAndStartCsgoServer({
        ...parsed.data,
        map: parsed.data.map ?? "de_dust2",
      })
    : await registerCsgoServer(parsed.data);
  if (!result.ok) return jsonError(502, result.message);

  await logAdminAction({
    adminId: admin!.id,
    action: "CSGO_SERVER_REGISTER",
    targetType: "csgo_server",
    targetId: result.server?.id ?? "unknown",
    summary: `Registrou servidor CS:GO ${parsed.data.name}`,
  });

  await afterCsgoServerMutation();

  return NextResponse.json(result);
}
