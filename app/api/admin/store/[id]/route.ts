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
import { adminStoreUpdateSchema } from "@/lib/admin/schemas";
import { storeItemWithRewardsInclude } from "@/lib/store/serialize";
import { enrichSingleStoreItemForAdmin } from "@/lib/store/enrich-admin-store";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guardError = await applyApiGuards(
    request,
    "admin-store-update",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await context.params;
  const existing = await prisma.storeItem.findUnique({ where: { id } });
  if (!existing) return jsonError(404, "Item não encontrado.");

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = adminStoreUpdateSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstZodError(parsed.error), fieldErrors: formatZodErrors(parsed.error) },
      { status: 400 },
    );
  }

  const item = await enrichSingleStoreItemForAdmin(
    await prisma.storeItem.update({
      where: { id },
      data: {
        ...parsed.data,
        ...(parsed.data.originalCents !== undefined
          ? { originalCents: parsed.data.originalCents ?? null }
          : {}),
        ...(parsed.data.coinPrice !== undefined
          ? { coinPrice: parsed.data.coinPrice ?? null }
          : {}),
        ...(parsed.data.imageUrl !== undefined
          ? { imageUrl: parsed.data.imageUrl ?? null }
          : {}),
        ...(parsed.data.maxPerUser !== undefined
          ? { maxPerUser: parsed.data.maxPerUser ?? null }
          : {}),
      },
      include: storeItemWithRewardsInclude,
    }),
  );

  await logAdminAction({
    adminId: admin!.id,
    action: "STORE_UPDATE",
    targetType: "store",
    targetId: id,
    summary: `Atualizou item: ${item.name}`,
  });

  return NextResponse.json({ ok: true, item });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guardError = await applyApiGuards(
    request,
    "admin-store-delete",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await context.params;
  const existing = await prisma.storeItem.findUnique({ where: { id } });
  if (!existing) return jsonError(404, "Item não encontrado.");

  await prisma.storeItem.delete({ where: { id } });

  await logAdminAction({
    adminId: admin!.id,
    action: "STORE_DELETE",
    targetType: "store",
    targetId: id,
    summary: `Removeu item: ${existing.name}`,
  });

  return NextResponse.json({ ok: true });
}
