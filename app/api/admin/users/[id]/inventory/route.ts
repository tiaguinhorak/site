import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { listUserGrantedCatalogSkins } from "@/lib/inventory/admin-catalog-grant";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await context.params;
  const items = await listUserGrantedCatalogSkins(id);
  return NextResponse.json({ ok: true, items });
}
