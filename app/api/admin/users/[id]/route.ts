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
import { formatPhoneBR } from "@/lib/security/sanitize";
import {
  formatZodErrors,
  firstZodError,
} from "@/lib/security/schemas";
import { logAdminAction } from "@/lib/admin/audit";
import { adminUserUpdateSchema } from "@/lib/admin/schemas";
import { getAdminUserDetail } from "@/lib/admin/queries";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await context.params;
  const user = await getAdminUserDetail(id);
  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guardError = await applyApiGuards(
    request,
    "admin-user-update",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await context.params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return jsonError(404, "Usuário não encontrado.");
  }

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = adminUserUpdateSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: firstZodError(parsed.error),
        fieldErrors: formatZodErrors(parsed.error),
      },
      { status: 400 },
    );
  }

  if (parsed.data.isAdmin === false && target.id === admin!.id) {
    return jsonError(400, "Você não pode remover seu próprio acesso admin.");
  }

  if (parsed.data.email !== undefined && parsed.data.email) {
    const emailTaken = await prisma.user.findFirst({
      where: { email: parsed.data.email, NOT: { id } },
    });
    if (emailTaken) {
      return jsonError(409, "E-mail já em uso.");
    }
  }

  if (parsed.data.nickname) {
    const nickTaken = await prisma.user.findFirst({
      where: { nickname: parsed.data.nickname, NOT: { id } },
    });
    if (nickTaken) {
      return jsonError(409, "Nickname já em uso.");
    }
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.phone !== undefined) {
    updateData.phone = formatPhoneBR(parsed.data.phone);
  }
  if (parsed.data.email === null) {
    updateData.email = null;
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
  });

  await logAdminAction({
    adminId: admin!.id,
    action: "USER_UPDATE",
    targetType: "user",
    targetId: id,
    summary: `Atualizou usuário ${updated.nickname}`,
    metadata: { fields: Object.keys(parsed.data) },
  });

  const user = await getAdminUserDetail(id);
  return NextResponse.json({ ok: true, user });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guardError = await applyApiGuards(
    request,
    "admin-user-delete",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await context.params;
  if (id === admin!.id) {
    return jsonError(400, "Você não pode excluir sua própria conta.");
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return jsonError(404, "Usuário não encontrado.");
  }

  await prisma.user.delete({ where: { id } });

  await logAdminAction({
    adminId: admin!.id,
    action: "USER_DELETE",
    targetType: "user",
    targetId: id,
    summary: `Excluiu usuário ${target.nickname}`,
  });

  return NextResponse.json({ ok: true });
}
