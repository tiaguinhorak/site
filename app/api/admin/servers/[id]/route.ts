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
import { afterCsgoServerMutation } from "@/lib/csgo-api/invalidate-caches";
import { updateCsgoServerMetadata } from "@/lib/csgo-api/server-control";
import { adminServerUpdateSchema } from "@/lib/admin/schemas";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guardError = await applyApiGuards(
    request,
    "admin-server-update",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await context.params;
  const existing = await prisma.publicServer.findUnique({ where: { id } });
  if (!existing) {
    return jsonError(404, "Servidor não encontrado.");
  }

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = adminServerUpdateSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: firstZodError(parsed.error),
        fieldErrors: formatZodErrors(parsed.error),
      },
      { status: 400 },
    );
  }

  const server = await prisma.publicServer.update({
    where: { id },
    data: parsed.data,
  });

  if (existing.csgoServerId && parsed.data.name) {
    await updateCsgoServerMetadata(existing.csgoServerId, { name: parsed.data.name });
  }

  if (existing.isLiveSynced) {
    await afterCsgoServerMutation();
  }

  await logAdminAction({
    adminId: admin!.id,
    action: "SERVER_UPDATE",
    targetType: "server",
    targetId: id,
    summary: `Atualizou servidor ${server.name}`,
    metadata: { fields: Object.keys(parsed.data) },
  });

  return NextResponse.json({ ok: true, server });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guardError = await applyApiGuards(
    request,
    "admin-server-delete",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await context.params;
  const existing = await prisma.publicServer.findUnique({ where: { id } });
  if (!existing) {
    return jsonError(404, "Servidor não encontrado.");
  }

  await prisma.publicServer.delete({ where: { id } });

  await logAdminAction({
    adminId: admin!.id,
    action: "SERVER_DELETE",
    targetType: "server",
    targetId: id,
    summary: `Removeu servidor ${existing.name}`,
  });

  return NextResponse.json({ ok: true });
}
