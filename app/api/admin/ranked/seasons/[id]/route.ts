import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { applyApiGuards, parseJsonBody } from "@/lib/security/api-guard";
import { requireAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { RATE_LIMITS } from "@/lib/security/constants";
import { formatZodErrors, firstZodError } from "@/lib/security/schemas";
import {
  getRankedSeasonById,
  RankedSeasonError,
  updateRankedSeason,
} from "@/lib/ranked/season-service";

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  seasonNumber: z.number().int().min(1).max(999).optional(),
  description: z.string().max(500).optional(),
  startsAt: z.string().min(1).optional(),
  endsAt: z.string().nullable().optional(),
  resetAt: z.string().nullable().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ENDED", "ARCHIVED"]).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

function parseDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Date(value);
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await context.params;
  const season = await getRankedSeasonById(id);
  if (!season) {
    return NextResponse.json({ error: "Temporada não encontrada." }, { status: 404 });
  }

  return NextResponse.json({ season });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const guardError = await applyApiGuards(
    request,
    "admin-ranked-season-update",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await context.params;
  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = updateSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstZodError(parsed.error), fieldErrors: formatZodErrors(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const season = await updateRankedSeason(id, {
      name: parsed.data.name,
      seasonNumber: parsed.data.seasonNumber,
      description: parsed.data.description,
      startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : undefined,
      endsAt:
        parsed.data.endsAt === undefined
          ? undefined
          : parsed.data.endsAt
            ? new Date(parsed.data.endsAt)
            : null,
      resetAt:
        parsed.data.resetAt === undefined
          ? undefined
          : parsed.data.resetAt
            ? new Date(parsed.data.resetAt)
            : null,
      status: parsed.data.status,
    });

    await logAdminAction({
      adminId: admin!.id,
      action: "RANKED_SEASON_UPDATE",
      targetType: "ranked_season",
      targetId: id,
      summary: `Atualizou temporada ${season.name}`,
    });

    return NextResponse.json({ ok: true, season });
  } catch (err) {
    if (err instanceof RankedSeasonError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
