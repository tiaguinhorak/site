import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/auth/session-user";
import { getCatalogSkinsForUser } from "@/lib/inventory/get-catalog-skins";
import { jsonErrorKey } from "@/lib/i18n/api-route";
import type { InventoryCategoryKey } from "@/lib/profile";
import type { LoadoutTeam } from "@/lib/inventory/loadout-team";
import type { RarityKey } from "@/lib/inventory/rarity-tiers";

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

  const dualTeamOnly = params.get("dualTeamOnly") === "1" || params.get("dualTeamOnly") === "true";
  const ownedOnly = params.get("ownedOnly") === "1" || params.get("ownedOnly") === "true";

  const rarityParam = params.get("rarityTier");
  const RARITY_TIERS = new Set<RarityKey>([
    "mythic",
    "legendary",
    "epic",
    "rare",
    "uncommon",
    "common",
  ]);
  const rarityTier = RARITY_TIERS.has(rarityParam as RarityKey)
    ? (rarityParam as RarityKey)
    : undefined;

  const result = await getCatalogSkinsForUser(userId, {
    category,
    search,
    weaponId,
    page: Number.isFinite(page) ? page : 1,
    limit: Number.isFinite(limit) ? limit : 36,
    team,
    dualTeamOnly,
    rarityTier,
    ownedOnly,
  });

  return NextResponse.json(result);
}
