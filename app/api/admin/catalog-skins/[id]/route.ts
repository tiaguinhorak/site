import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { adminCatalogSkinUpdateSchema } from "@/lib/admin/schemas";
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
  deleteCatalogSkinAdmin,
  updateCatalogSkinAdmin,
} from "@/lib/inventory/catalog-admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const guardError = await applyApiGuards(
    request,
    "admin-catalog-skin-update",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await context.params;
  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = adminCatalogSkinUpdateSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstZodError(parsed.error), fieldErrors: formatZodErrors(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const item = await updateCatalogSkinAdmin(id, parsed.data);
    await logAdminAction({
      adminId: admin!.id,
      action: "CATALOG_SKIN_UPDATE",
      targetType: "catalog_skin",
      targetId: id,
      summary: `Atualizou skin ${item.weaponName} | ${item.paintkitName}`,
    });
    return NextResponse.json({ ok: true, item });
  } catch {
    return NextResponse.json({ error: "Skin não encontrada." }, { status: 404 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const guardError = await applyApiGuards(
    request,
    "admin-catalog-skin-delete",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await context.params;

  try {
    await deleteCatalogSkinAdmin(id);
    await logAdminAction({
      adminId: admin!.id,
      action: "CATALOG_SKIN_DELETE",
      targetType: "catalog_skin",
      targetId: id,
      summary: `Removeu skin do catálogo (${id})`,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Skin não encontrada." }, { status: 404 });
  }
}
