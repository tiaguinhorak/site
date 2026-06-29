import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { after } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { applyApiGuards, parseJsonBody } from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import {
  importAllAgentsFromApi,
  listAgentCatalogAdmin,
  upsertAgentByDefIndex,
} from "@/lib/inventory/agent-catalog-admin";
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
  const enabledOnly = params.get("enabledOnly") === "1";
  const teamParam = params.get("team");
  const team = teamParam === "T" || teamParam === "CT" ? teamParam : undefined;

  try {
    const result = await listAgentCatalogAdmin({
      page: Number.isFinite(page) ? page : 1,
      limit: Number.isFinite(limit) ? limit : 40,
      search,
      enabledOnly,
      team,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[admin/agent-catalog GET]", err);
    const message = err instanceof Error ? err.message : "Falha ao carregar catálogo de agentes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "admin-agent-catalog-create",
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
    const job = createCatalogImportJob(admin!.id, "agents");
    const adminId = admin!.id;

    after(async () => {
      try {
        const result = await importAllAgentsFromApi({ enabled: true });
        completeCatalogImportJob(job.id, { imported: result.imported });
        await logAdminAction({
          adminId,
          action: "AGENT_CATALOG_IMPORT_ALL",
          targetType: "agent_catalog",
          summary: `Importou ${result.imported} agentes da CSGO-API`,
        });
        await notifyCatalogImportResult(
          adminId,
          "agents",
          true,
          `Importados ${result.imported} agentes da CSGO-API.`,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Falha ao importar.";
        failCatalogImportJob(job.id, message);
        await notifyCatalogImportResult(adminId, "agents", false, message);
      }
    });

    return NextResponse.json({ ok: true, jobId: job.id, status: "running" });
  }

  const defIndex = Number(data?.defIndex);
  if (!Number.isFinite(defIndex) || defIndex <= 0) {
    return NextResponse.json({ error: "def_index inválido." }, { status: 400 });
  }

  try {
    const item = await upsertAgentByDefIndex(defIndex, data?.enabled !== false);
    await logAdminAction({
      adminId: admin!.id,
      action: "AGENT_CATALOG_CREATE",
      targetType: "agent_catalog",
      targetId: item.id,
      summary: `Adicionou agente ${item.name} (def_index ${item.defIndex})`,
    });
    return NextResponse.json({ ok: true, item });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao adicionar agente.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
