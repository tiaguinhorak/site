import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { CsgoApiError } from "@/lib/csgo-api/http";
import {
  grantEconomyDefIndexToUser,
  listEconomyCatalogForUserGrant,
  listGrantedEconomyItemsForUser,
  revokeEconomyDefIndexFromUser,
} from "@/lib/inventory/admin-economy-grant";
import {
  adminInventoryGrantEconomySchema,
  adminInventoryRevokeEconomySchema,
} from "@/lib/admin/schemas";
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

function parseKind(value: string | null): "AGENT" | "STICKER" | null {
  if (value === "AGENT" || value === "agent") return "AGENT";
  if (value === "STICKER" || value === "sticker") return "STICKER";
  return null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id: userId } = await context.params;
  const params = request.nextUrl.searchParams;
  const kind = parseKind(params.get("kind"));
  if (!kind) {
    return NextResponse.json({ error: "kind inválido (AGENT ou STICKER)." }, { status: 400 });
  }

  const view = params.get("view") ?? "catalog";
  if (view === "granted") {
    const items = await listGrantedEconomyItemsForUser(userId, kind);
    return NextResponse.json({ items });
  }

  const page = Number(params.get("page") ?? "1");
  const limit = Number(params.get("limit") ?? "36");
  const search = params.get("search") ?? "";
  const ownershipParam = params.get("ownership") ?? "all";
  const ownership =
    ownershipParam === "owned" || ownershipParam === "missing"
      ? ownershipParam
      : "all";
  const teamParam = params.get("team");
  const team = teamParam === "T" || teamParam === "CT" ? teamParam : undefined;

  const result = await listEconomyCatalogForUserGrant(userId, kind, {
    page: Number.isFinite(page) ? page : 1,
    limit: Number.isFinite(limit) ? limit : 36,
    search,
    ownership,
    team,
  });

  return NextResponse.json(result);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guardError = await applyApiGuards(
    request,
    "admin-inventory-grant-economy",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { id: userId } = await context.params;
  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = adminInventoryGrantEconomySchema.safeParse(data);
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
    const result = await grantEconomyDefIndexToUser(
      admin!.id,
      userId,
      parsed.data.kind,
      parsed.data.defIndex,
    );
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof CsgoApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[admin inventory grant-economy]", err);
    return NextResponse.json({ error: apiErrFromRequest(request, "internal") }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guardError = await applyApiGuards(
    request,
    "admin-inventory-revoke-economy",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { id: userId } = await context.params;
  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = adminInventoryRevokeEconomySchema.safeParse(data);
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
    const result = await revokeEconomyDefIndexFromUser(
      admin!.id,
      userId,
      parsed.data.kind,
      parsed.data.defIndex,
    );
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof CsgoApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[admin inventory revoke-economy]", err);
    return NextResponse.json({ error: apiErrFromRequest(request, "internal") }, { status: 500 });
  }
}
