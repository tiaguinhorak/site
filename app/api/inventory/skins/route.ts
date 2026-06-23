import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/auth/session-user";
import { getCatalogSkinsForUser } from "@/lib/inventory/get-catalog-skins";
import { jsonErrorKey } from "@/lib/i18n/api-route";
import type { InventoryCategoryKey } from "@/lib/profile";
import type { LoadoutTeam } from "@/lib/inventory/loadout-team";

const CATEGORIES = new Set<InventoryCategoryKey | "all">([
  "all",
  "knife",
  "gloves",
  "rifle",
  "pistol",
  "smg",
  "agent",
]);

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId(request);
  if (!userId) {
    return jsonErrorKey(request, 401, "unauthorized");
  }

  const params = request.nextUrl.searchParams;
  const categoryParam = params.get("category") ?? "all";
  const category = CATEGORIES.has(categoryParam as InventoryCategoryKey | "all")
    ? (categoryParam as InventoryCategoryKey | "all")
    : "all";
  const search = params.get("search") ?? "";
  const weaponId = params.get("weaponId") ?? "";
  const page = Number(params.get("page") ?? "1");
  const limit = Number(params.get("limit") ?? "36");

  const teamParam = params.get("team");
  const team =
    teamParam === "T" || teamParam === "CT" ? (teamParam as LoadoutTeam) : undefined;

  const result = await getCatalogSkinsForUser(userId, {
    category,
    search,
    weaponId,
    page: Number.isFinite(page) ? page : 1,
    limit: Number.isFinite(limit) ? limit : 36,
    team,
  });

  return NextResponse.json(result);
}
