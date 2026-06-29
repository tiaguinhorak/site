import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { lookupAgentCatalogPreview } from "@/lib/inventory/agent-catalog-admin";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const defIndex = Number(request.nextUrl.searchParams.get("defIndex"));
  if (!Number.isFinite(defIndex) || defIndex <= 0) {
    return NextResponse.json({ error: "def_index inválido." }, { status: 400 });
  }

  const preview = await lookupAgentCatalogPreview(defIndex);
  return NextResponse.json(preview);
}
