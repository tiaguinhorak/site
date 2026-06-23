import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { adminStickerCatalogCreateSchema } from "@/lib/admin/schemas";
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
  importAllStickersFromApi,
  listStickerCatalogAdmin,
  upsertStickerByDefIndex,
} from "@/lib/inventory/sticker-catalog-admin";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const params = request.nextUrl.searchParams;
  const page = Number(params.get("page") ?? "1");
  const limit = Number(params.get("limit") ?? "40");
  const search = params.get("search") ?? "";
  const enabledOnly = params.get("enabledOnly") === "1";

  const result = await listStickerCatalogAdmin({
    page: Number.isFinite(page) ? page : 1,
    limit: Number.isFinite(limit) ? limit : 40,
    search,
    enabledOnly,
  });

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "admin-sticker-catalog-create",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const action = typeof data?.action === "string" ? data.action : "create";

  if (action === "import-all") {
    try {
      const result = await importAllStickersFromApi({ enabled: true });
      await logAdminAction({
        adminId: admin!.id,
        action: "STICKER_CATALOG_IMPORT_ALL",
        targetType: "sticker_catalog",
        summary: `Importou ${result.imported} stickers da CSGO-API`,
      });
      return NextResponse.json({ ok: true, ...result });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao importar.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  const parsed = adminStickerCatalogCreateSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstZodError(parsed.error), fieldErrors: formatZodErrors(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const item = await upsertStickerByDefIndex(parsed.data.defIndex, parsed.data.enabled);
    await logAdminAction({
      adminId: admin!.id,
      action: "STICKER_CATALOG_CREATE",
      targetType: "sticker_catalog",
      targetId: item.id,
      summary: `Adicionou sticker ${item.name} (def_index ${item.defIndex})`,
    });
    return NextResponse.json({ ok: true, item });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao adicionar sticker.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
