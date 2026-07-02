import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { listCatalogSkinsForUserGrant } from "@/lib/inventory/admin-catalog-grant";
import { getCatalogWeaponOptions } from "@/lib/inventory/get-catalog-weapon-options";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id: userId } = await context.params;
  const params = request.nextUrl.searchParams;
  const page = Number(params.get("page") ?? "1");
  const limit = Number(params.get("limit") ?? "36");
  const search = params.get("search") ?? "";
  const weaponId = params.get("weaponId") ?? "";
  const categoryParam = params.get("category") ?? "all";
  const category =
    categoryParam === "knife" ||
    categoryParam === "gloves" ||
    categoryParam === "rifle" ||
    categoryParam === "pistol" ||
    categoryParam === "smg"
      ? categoryParam
      : "all";
  const ownershipParam = params.get("ownership") ?? "all";
  const ownership =
    ownershipParam === "owned" || ownershipParam === "missing"
      ? ownershipParam
      : "all";

  const result = await listCatalogSkinsForUserGrant(userId, {
    page: Number.isFinite(page) ? page : 1,
    limit: Number.isFinite(limit) ? limit : 36,
    search,
    weaponId: weaponId || undefined,
    category,
    ownership,
  });

  const weaponOptions =
    page === 1 || params.get("weapons") === "1"
      ? await getCatalogWeaponOptions(category === "all" ? "all" : category)
      : [];

  return NextResponse.json({ ...result, weaponOptions });
}
