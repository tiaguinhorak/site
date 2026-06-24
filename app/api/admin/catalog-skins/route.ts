import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { after } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/admin/audit";
import {
  adminCatalogSkinCreateSchema,
  adminCatalogSkinImportSchema,
} from "@/lib/admin/schemas";
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
  importWeaponSkinsFromApi,
  listCatalogSkinsAdmin,
  upsertCatalogSkinFromPaintkit,
} from "@/lib/inventory/catalog-admin";
import { listApiWeaponOptions } from "@/lib/inventory/csgo-api-index";
import {
  createCatalogImportJob,
  completeCatalogImportJob,
  failCatalogImportJob,
} from "@/lib/admin/catalog-import-jobs";
import { notifyCatalogImportResult } from "@/lib/admin/catalog-import-notifications";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const params = request.nextUrl.searchParams;
  const page = Number(params.get("page") ?? "1");
  const limit = Number(params.get("limit") ?? "40");
  const search = params.get("search") ?? "";
  const weaponId = params.get("weaponId") ?? "";
  const enabledOnly = params.get("enabledOnly") === "1";

  const result = await listCatalogSkinsAdmin({
    page: Number.isFinite(page) ? page : 1,
    limit: Number.isFinite(limit) ? limit : 40,
    search,
    weaponId: weaponId || undefined,
    enabledOnly,
  });

  const weaponOptions =
    page === 1 || params.get("weapons") === "1"
      ? await listApiWeaponOptions()
      : [];

  return NextResponse.json({ ...result, weaponOptions });
}

export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "admin-catalog-skin-create",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const action = typeof data?.action === "string" ? data.action : "create";

  if (action === "import-weapon") {
    const parsed = adminCatalogSkinImportSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: firstZodError(parsed.error), fieldErrors: formatZodErrors(parsed.error) },
        { status: 400 },
      );
    }

    try {
      const weaponId = parsed.data.weaponId;
      const enabled = parsed.data.enabled;
      const job = createCatalogImportJob(admin!.id, "skins");
      const adminId = admin!.id;

      after(async () => {
        try {
          const result = await importWeaponSkinsFromApi(weaponId, { enabled });
          completeCatalogImportJob(job.id, {
            imported: result.imported,
            skippedCs2: result.skippedCs2,
            weaponId,
          });
          await logAdminAction({
            adminId,
            action: "CATALOG_SKIN_IMPORT_WEAPON",
            targetType: "catalog_skin",
            targetId: weaponId,
            summary: `Importou ${result.imported} skins de ${weaponId} (${result.skippedCs2} CS2 ignoradas)`,
          });
          await notifyCatalogImportResult(
            adminId,
            "skins",
            true,
            `Importadas ${result.imported} skins de ${weaponId}.${result.skippedCs2 ? ` ${result.skippedCs2} skins CS2 ignoradas.` : ""}`,
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : "Falha ao importar.";
          failCatalogImportJob(job.id, message);
          await notifyCatalogImportResult(adminId, "skins", false, message);
        }
      });

      return NextResponse.json({ ok: true, jobId: job.id, status: "running" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao importar.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  const parsed = adminCatalogSkinCreateSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstZodError(parsed.error), fieldErrors: formatZodErrors(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const item = await upsertCatalogSkinFromPaintkit({
      weaponId: parsed.data.weaponId,
      paintkit: parsed.data.paintkit,
      source: "admin",
      enabled: parsed.data.enabled,
      paintkitName: parsed.data.paintkitName,
      imageUrl: parsed.data.imageUrl ?? undefined,
    });

    await logAdminAction({
      adminId: admin!.id,
      action: "CATALOG_SKIN_CREATE",
      targetType: "catalog_skin",
      targetId: item.id,
      summary: `Adicionou skin ${item.weaponName} | ${item.paintkitName} (${item.paintkit})`,
    });

    return NextResponse.json({ ok: true, item });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao adicionar skin.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
