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
import {
  formatZodErrors,
  firstZodError,
} from "@/lib/security/schemas";
import { logAdminAction } from "@/lib/admin/audit";
import { adminGameModeUpdateSchema } from "@/lib/admin/schemas";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guardError = await applyApiGuards(
    request,
    "admin-game-mode-update",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await context.params;
  const existing = await prisma.gameMode.findUnique({ where: { id } });
  if (!existing) return jsonError(404, "Modo não encontrado.");

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = adminGameModeUpdateSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstZodError(parsed.error), fieldErrors: formatZodErrors(parsed.error) },
      { status: 400 },
    );
  }

  if (parsed.data.slug && parsed.data.slug !== existing.slug) {
    const slugTaken = await prisma.gameMode.findUnique({
      where: { slug: parsed.data.slug },
    });
    if (slugTaken) return jsonError(409, "Slug já em uso.");
  }

  const mode = await prisma.gameMode.update({
    where: { id },
    data: parsed.data,
    include: { rooms: { orderBy: { sortOrder: "asc" } } },
  });

  await logAdminAction({
    adminId: admin!.id,
    action: "GAME_MODE_UPDATE",
    targetType: "game_mode",
    targetId: id,
    summary: `Atualizou modo: ${mode.name}`,
  });

  return NextResponse.json({ ok: true, mode });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guardError = await applyApiGuards(
    request,
    "admin-game-mode-delete",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await context.params;
  const existing = await prisma.gameMode.findUnique({ where: { id } });
  if (!existing) return jsonError(404, "Modo não encontrado.");

  await prisma.gameMode.delete({ where: { id } });

  await logAdminAction({
    adminId: admin!.id,
    action: "GAME_MODE_DELETE",
    targetType: "game_mode",
    targetId: id,
    summary: `Removeu modo: ${existing.name}`,
  });

  return NextResponse.json({ ok: true });
}
