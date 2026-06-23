import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import {
  buildWeaponsCfgSnippet,
  getEnabledCatalogAllowlistEntries,
} from "@/lib/inventory/catalog-admin";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const entries = await getEnabledCatalogAllowlistEntries();
  const cfg = buildWeaponsCfgSnippet(entries);

  const download = request.nextUrl.searchParams.get("download") === "1";
  if (download) {
    return new NextResponse(cfg, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": "attachment; filename=weapons_enabled_snippet.cfg",
      },
    });
  }

  return NextResponse.json({
    ok: true,
    count: entries.length,
    cfg,
  });
}
