import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/admin/audit";
import {
  deleteAgentCatalogEntry,
  setAgentCatalogEnabled,
} from "@/lib/inventory/agent-catalog-admin";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { error, user: admin } = await requireAdmin(request);
  if (error) return error;

  const { id } = await context.params;
  const body = (await request.json()) as { enabled?: boolean };
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled é obrigatório." }, { status: 400 });
  }

  const item = await setAgentCatalogEnabled(id, body.enabled);
  await logAdminAction({
    adminId: admin!.id,
    action: body.enabled ? "AGENT_CATALOG_ENABLE" : "AGENT_CATALOG_DISABLE",
    targetType: "agent_catalog",
    targetId: id,
    summary: `${body.enabled ? "Ativou" : "Desativou"} agente ${item.name}`,
  });

  return NextResponse.json({ ok: true, item });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { error, user: admin } = await requireAdmin(request);
  if (error) return error;

  const { id } = await context.params;
  await deleteAgentCatalogEntry(id);
  await logAdminAction({
    adminId: admin!.id,
    action: "AGENT_CATALOG_DELETE",
    targetType: "agent_catalog",
    targetId: id,
    summary: `Removeu agente ${id} do catálogo`,
  });

  return NextResponse.json({ ok: true });
}
