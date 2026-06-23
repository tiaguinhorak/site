import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getEnabledCatalogAllowlistEntries } from "@/lib/inventory/catalog-admin";
import { isValidSkinsSyncRequest } from "@/lib/env/skins-sync";

const SYNC_HEADER = "x-skins-sync-key";

export async function GET(request: NextRequest) {
  const providedKey =
    request.headers.get(SYNC_HEADER) ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    null;

  if (!isValidSkinsSyncRequest(providedKey)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await getEnabledCatalogAllowlistEntries();
  const keys = entries.map((e) => e.key);

  return NextResponse.json({
    ok: true,
    source: "site-db",
    count: entries.length,
    keys,
    entries: entries.map(({ weaponId, paintkit, name }) => ({
      weaponId,
      paintkit,
      name,
    })),
  });
}
