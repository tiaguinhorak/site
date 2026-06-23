import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { lookupCatalogSkinPreview } from "@/lib/inventory/catalog-admin";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const weaponId = request.nextUrl.searchParams.get("weaponId")?.trim() ?? "";
  const paintkit = Number(request.nextUrl.searchParams.get("paintkit"));

  if (!weaponId || !Number.isFinite(paintkit) || paintkit <= 0) {
    return NextResponse.json(
      { error: "weaponId e paintkit válidos são obrigatórios." },
      { status: 400 },
    );
  }

  const preview = await lookupCatalogSkinPreview(weaponId, paintkit);
  return NextResponse.json(preview);
}
