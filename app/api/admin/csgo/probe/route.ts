import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { prisma } from "@/lib/prisma";
import {
  applyApiGuards,
  jsonError,
  parseJsonBody,
} from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import { firstZodError } from "@/lib/security/schemas";
import { probeGameServer } from "@/lib/csgo-api/probe-game-server";
import { invalidateCsgoRuntimeCaches } from "@/lib/csgo-api/invalidate-caches";
import { refreshCsgoServerLive } from "@/lib/csgo-api/query-live-server";

const probeSchema = z.object({
  host: z.string().min(3).max(120),
  port: z.number().int().min(1).max(65535),
  rconPort: z.number().int().min(1).max(65535).optional(),
  rconPassword: z.string().max(120).optional(),
});

const publishSchema = z.object({
  action: z.enum(["publish", "unpublish"]),
  name: z.string().min(2).max(80).optional(),
  host: z.string().min(3).max(120),
  port: z.number().int().min(1).max(65535),
  mode: z.string().min(2).max(40).optional(),
});

export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "admin-csgo-probe",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const body = data as Record<string, unknown>;

  if (body.action === "publish" || body.action === "unpublish") {
    const publishParsed = publishSchema.safeParse(data);
    if (!publishParsed.success) return jsonError(400, firstZodError(publishParsed.error));

    const { action, host, port, name, mode } = publishParsed.data;

    if (action === "unpublish") {
      const deleted = await prisma.publicServer.deleteMany({
        where: { host, port, csgoServerId: null, isLiveSynced: true },
      });

      invalidateCsgoRuntimeCaches();

      await logAdminAction({
        adminId: admin!.id,
        action: "SERVER_DELETE",
        targetType: "server",
        summary: `Removeu warmup de teste ${host}:${port}`,
      });

      return NextResponse.json({ ok: true, removed: deleted.count });
    }

    const live = await refreshCsgoServerLive(host, port);
    const displayName = name?.trim() || `Warmup ${host}`;
    const serverMode = mode?.trim() || "Warmup";

    const existing = await prisma.publicServer.findFirst({
      where: { host, port, csgoServerId: null, isLiveSynced: true },
    });

    const row = existing
      ? await prisma.publicServer.update({
          where: { id: existing.id },
          data: {
            name: displayName,
            mode: serverMode,
            map: live.mapRaw ?? live.map,
            players: live.players,
            slots: live.online ? live.slots : 10,
            ping: live.ping,
            sortOrder: -500,
          },
        })
      : await prisma.publicServer.create({
          data: {
            name: displayName,
            host,
            port,
            mode: serverMode,
            map: live.mapRaw ?? live.map,
            players: live.players,
            slots: live.online ? live.slots : 10,
            ping: live.ping,
            sortOrder: -500,
            isLiveSynced: true,
            csgoServerId: null,
          },
        });

    invalidateCsgoRuntimeCaches();

    await logAdminAction({
      adminId: admin!.id,
      action: "SERVER_CREATE",
      targetType: "server",
      targetId: row.id,
      summary: `Publicou warmup de teste ${displayName} (${host}:${port})`,
    });

    return NextResponse.json({ ok: true, server: row });
  }

  const parsed = probeSchema.safeParse(data);
  if (!parsed.success) return jsonError(400, firstZodError(parsed.error));

  const result = await probeGameServer({
    host: parsed.data.host.trim(),
    port: parsed.data.port,
    rconPort: parsed.data.rconPort ?? parsed.data.port,
    rconPassword: parsed.data.rconPassword?.trim(),
  });

  return NextResponse.json(result);
}
