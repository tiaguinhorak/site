import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { adminStickerCatalogUpdateSchema } from "@/lib/admin/schemas";
import {
  applyApiGuards,
  parseJsonBody,
} from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import {
  formatZodErrors,
  firstZodError,
} from "@/lib/security/schemas";
import {
  deleteStickerCatalogAdmin,
  updateStickerCatalogAdmin,
} from "@/lib/inventory/sticker-catalog-admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const guardError = await applyApiGuards(
    request,
    "admin-sticker-catalog-update",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await context.params;
  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = adminStickerCatalogUpdateSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstZodError(parsed.error), fieldErrors: formatZodErrors(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const item = await updateStickerCatalogAdmin(id, parsed.data);
    await logAdminAction({
      adminId: admin!.id,
      action: "STICKER_CATALOG_UPDATE",
      targetType: "sticker_catalog",
      targetId: id,
      summary: `Atualizou sticker ${item.name}`,
    });
    return NextResponse.json({ ok: true, item });
  } catch {
    return NextResponse.json({ error: "Sticker não encontrado." }, { status: 404 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const guardError = await applyApiGuards(
    request,
    "admin-sticker-catalog-delete",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await context.params;

  try {
    await deleteStickerCatalogAdmin(id);
    await logAdminAction({
      adminId: admin!.id,
      action: "STICKER_CATALOG_DELETE",
      targetType: "sticker_catalog",
      targetId: id,
      summary: `Removeu sticker do catálogo (${id})`,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Sticker não encontrado." }, { status: 404 });
  }
}
