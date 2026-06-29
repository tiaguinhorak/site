import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/auth/session-user";
import { getCatalogSkinsForUser } from "@/lib/inventory/get-catalog-skins";
import { getUserServerLoadout } from "@/lib/inventory/get-user-loadout";
import { jsonErrorKey } from "@/lib/i18n/api-route";

/** Single endpoint for loadout + default catalog grid (matches SSR bootstrap). */
export async function GET(request: NextRequest) {
  const userId = await getSessionUserId(request);
  if (!userId) {
    return jsonErrorKey(request, 401, "unauthorized");
  }

  const [loadout, catalog] = await Promise.all([
    getUserServerLoadout(userId),
    getCatalogSkinsForUser(userId, { category: "all", page: 1, limit: 36 }),
  ]);

  return NextResponse.json({ loadout, catalog });
}
