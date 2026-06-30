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
import { adminWarmupModeUpdateSchema } from "@/lib/admin/schemas";
import { toWarmupModeDef, refreshWarmupModeTranslations } from "@/lib/warmup/modes-service";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const guardError = await applyApiGuards(
    request,
    "admin-warmup-mode-update",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await params;
  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = adminWarmupModeUpdateSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstZodError(parsed.error), fieldErrors: formatZodErrors(parsed.error) },
      { status: 400 },
    );
  }

  const existing = await prisma.warmupMode.findUnique({ where: { id } });
  if (!existing) return jsonError(404, "Modo não encontrado.");

  if (parsed.data.slug && parsed.data.slug !== existing.slug) {
    const slugTaken = await prisma.warmupMode.findUnique({ where: { slug: parsed.data.slug } });
    if (slugTaken) return jsonError(409, "Slug já em uso.");
  }

  const { maps, ...fields } = parsed.data;

  const mode = await prisma.$transaction(async (tx) => {
    if (maps) {
      await tx.warmupModeMap.deleteMany({ where: { warmupModeId: id } });
      if (maps.length > 0) {
        await tx.warmupModeMap.createMany({
          data: maps.map((mapId, index) => ({
            warmupModeId: id,
            mapId,
            sortOrder: index,
          })),
        });
      }
    }

    return tx.warmupMode.update({
      where: { id },
      data: {
        ...(fields.slug !== undefined ? { slug: fields.slug } : {}),
        ...(fields.label !== undefined ? { label: fields.label } : {}),
        ...(fields.modeLabel !== undefined ? { modeLabel: fields.modeLabel } : {}),
        ...(fields.iconKey !== undefined ? { iconKey: fields.iconKey } : {}),
        ...(fields.accent !== undefined ? { accent: fields.accent } : {}),
        ...(fields.sortOrder !== undefined ? { sortOrder: fields.sortOrder } : {}),
        ...(fields.enabled !== undefined ? { enabled: fields.enabled } : {}),
      },
      include: { maps: { orderBy: { sortOrder: "asc" } } },
    });
  });

  void refreshWarmupModeTranslations({
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
  }).catch((err) => console.error("[admin/warmup-modes] auto-translate failed", err));

  await logAdminAction({
    adminId: admin!.id,
    action: "WARMUP_MODE_UPDATE",
    targetType: "warmup_mode",
    targetId: mode.id,
    summary: `Atualizou modo warmup: ${mode.label}`,
  });

  return NextResponse.json({
    ok: true,
    mode: toWarmupModeDef({
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
    }),
  });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const guardError = await applyApiGuards(
    request,
    "admin-warmup-mode-delete",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await params;
  const existing = await prisma.warmupMode.findUnique({ where: { id } });
  if (!existing) return jsonError(404, "Modo não encontrado.");

  await prisma.warmupMode.delete({ where: { id } });

  await logAdminAction({
    adminId: admin!.id,
    action: "WARMUP_MODE_DELETE",
    targetType: "warmup_mode",
    targetId: id,
    summary: `Removeu modo warmup: ${existing.label}`,
  });

  return NextResponse.json({ ok: true });
}
