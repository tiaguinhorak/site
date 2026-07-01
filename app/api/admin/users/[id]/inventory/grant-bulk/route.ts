import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { CsgoApiError } from "@/lib/csgo-api/http";
import { grantCatalogSkinsToUserBulk } from "@/lib/inventory/admin-catalog-grant";
import { grantEconomyDefIndexesToUserBulk } from "@/lib/inventory/admin-economy-grant";
import { adminInventoryGrantBulkSchema } from "@/lib/admin/schemas";
import {
  applyApiGuards,
  parseJsonBody,
} from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import {
  formatZodErrors,
  firstZodError,
} from "@/lib/security/schemas";
import { apiErrFromRequest } from "@/lib/i18n/api-route";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guardError = await applyApiGuards(
    request,
    "admin-inventory-grant-bulk",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { id: userId } = await context.params;
  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = adminInventoryGrantBulkSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: firstZodError(parsed.error),
        fieldErrors: formatZodErrors(parsed.error),
      },
      { status: 400 },
    );
  }

  try {
    const results: Array<{ grantedCount: number; skippedCount: number }> = [];

    if (parsed.data.catalogSkinIds?.length) {
      results.push(
        await grantCatalogSkinsToUserBulk(admin!.id, userId, parsed.data.catalogSkinIds),
      );
    }
    if (parsed.data.agentDefIndexes?.length) {
      results.push(
        await grantEconomyDefIndexesToUserBulk(
          admin!.id,
          userId,
          "AGENT",
          parsed.data.agentDefIndexes,
        ),
      );
    }
    if (parsed.data.stickerDefIndexes?.length) {
      results.push(
        await grantEconomyDefIndexesToUserBulk(
          admin!.id,
          userId,
          "STICKER",
          parsed.data.stickerDefIndexes,
        ),
      );
    }

    const grantedCount = results.reduce((sum, row) => sum + row.grantedCount, 0);
    const skippedCount = results.reduce((sum, row) => sum + row.skippedCount, 0);

    return NextResponse.json({
      ok: true,
      grantedCount,
      skippedCount,
    });
  } catch (err) {
    if (err instanceof CsgoApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[admin inventory grant-bulk]", err);
    return NextResponse.json({ error: apiErrFromRequest(request, "internal") }, { status: 500 });
  }
}
