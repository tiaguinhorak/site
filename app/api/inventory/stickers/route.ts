import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ensureLegacyStickerCatalogAndLoadouts,
  listEnabledStickersForPicker,
} from "@/lib/inventory/sticker-catalog-admin";
import type { StickerFinishVariant } from "@/lib/inventory/sticker-finish-variant";
import { getUserObtainedStickerDefIndexes } from "@/lib/inventory/user-obtained-economy";
import { getInventoryPlanLimitsCached } from "@/lib/inventory/plan-limits-cache";
import { getSessionUserId } from "@/lib/auth/session-user";
import { jsonErrorKey } from "@/lib/i18n/api-route";

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId(request);
  if (!userId) {
    return jsonErrorKey(request, 401, "unauthorized");
  }

  const params = request.nextUrl.searchParams;
  const search = params.get("search") ?? "";
  const page = Number(params.get("page") ?? "1");
  const limit = Number(params.get("limit") ?? "24");
  const ownedOnly = params.get("ownedOnly") === "1";
  const finishVariant = params.get("finishVariant")?.trim() ?? "";

  void ensureLegacyStickerCatalogAndLoadouts();

  const [ownedDefIndexes, limits] = await Promise.all([
    getUserObtainedStickerDefIndexes(userId),
    getInventoryPlanLimitsCached(userId),
  ]);

  const result = await listEnabledStickersForPicker({
    search,
    page: Number.isFinite(page) ? page : 1,
    limit: Number.isFinite(limit) ? limit : 24,
    finishVariant: (finishVariant as StickerFinishVariant | "") || "",
    ownedOnly,
    ownedDefIndexes,
  });

  return NextResponse.json({
    ...result,
    canUseStickers: limits.canUseStickers,
  });
}
