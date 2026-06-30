import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyApiGuards,
  jsonError,
  parseJsonBody,
} from "@/lib/security/api-guard";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { RATE_LIMITS } from "@/lib/security/constants";
import { formatZodErrors, firstZodError } from "@/lib/security/schemas";
import { logAdminAction } from "@/lib/admin/audit";
import { adminWarmupModeCreateSchema } from "@/lib/admin/schemas";
import { listWarmupModes, toWarmupModeDef } from "@/lib/warmup/modes-service";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const modes = await listWarmupModes({ includeDisabled: true });
  return NextResponse.json({
    modes: modes.map((m) => ({
      ...toWarmupModeDef(m),
      dbId: m.dbId,
      sortOrder: m.sortOrder,
    })),
  });
}

export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "admin-warmup-mode-create",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = adminWarmupModeCreateSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstZodError(parsed.error), fieldErrors: formatZodErrors(parsed.error) },
      { status: 400 },
    );
  }

  const slugTaken = await prisma.warmupMode.findUnique({ where: { slug: parsed.data.slug } });
  if (slugTaken) return jsonError(409, "Slug já em uso.");

  const mode = await prisma.warmupMode.create({
    data: {
      slug: parsed.data.slug,
      label: parsed.data.label,
      modeLabel: parsed.data.modeLabel,
      iconKey: parsed.data.iconKey ?? "Crosshair",
      accent: parsed.data.accent ?? "from-violet-600 to-purple-800",
      sortOrder: parsed.data.sortOrder,
      enabled: parsed.data.enabled ?? true,
      maps: parsed.data.maps?.length
        ? {
            create: parsed.data.maps.map((mapId, index) => ({
              mapId,
              sortOrder: index,
            })),
          }
        : undefined,
    },
    include: { maps: { orderBy: { sortOrder: "asc" } } },
  });

  await logAdminAction({
    adminId: admin!.id,
    action: "WARMUP_MODE_CREATE",
    targetType: "warmup_mode",
    targetId: mode.id,
    summary: `Criou modo warmup: ${mode.label}`,
  });

  return NextResponse.json({ ok: true, mode: toWarmupModeDef({
    dbId: mode.id,
    id: mode.slug,
    slug: mode.slug,
    label: mode.label,
    modeLabel: mode.modeLabel,
    icon: mode.iconKey,
    accent: mode.accent,
    enabled: mode.enabled,
    sortOrder: mode.sortOrder,
    maps: mode.maps.map((m) => m.mapId),
  }) });
}
