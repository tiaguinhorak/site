import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { CsgoApiError } from "@/lib/csgo-api/http";
import { grantCatalogSkinToUser } from "@/lib/inventory/admin-catalog-grant";
import { adminInventoryGrantSchema } from "@/lib/admin/schemas";
import {
  applyApiGuards,
  parseJsonBody,
} from "@/lib/security/api-guard";
import { RATE_LIMITS } from "@/lib/security/constants";
import {
  formatZodErrors,
  firstZodError,
} from "@/lib/security/schemas";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guardError = await applyApiGuards(
    request,
    "admin-inventory-grant",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { id: userId } = await context.params;
  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = adminInventoryGrantSchema.safeParse(data);
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
    const result = await grantCatalogSkinToUser(
      admin!.id,
      userId,
      parsed.data.catalogSkinId,
    );
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof CsgoApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Falha ao conceder skin." }, { status: 500 });
  }
}
