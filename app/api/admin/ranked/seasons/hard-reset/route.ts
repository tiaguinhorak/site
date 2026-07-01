import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { applyApiGuards, parseJsonBody } from "@/lib/security/api-guard";
import { requireAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { RATE_LIMITS } from "@/lib/security/constants";
import { formatZodErrors, firstZodError } from "@/lib/security/schemas";
import {
  RankedSeasonError,
  hardResetRankedSeasonSystem,
} from "@/lib/ranked/season-service";

const bodySchema = z.object({
  confirm: z.literal("RESET_ALL_SEASONS"),
  seasonName: z.string().min(1).max(80).optional(),
  seasonNumber: z.number().int().min(1).max(999).optional(),
});

export async function POST(request: NextRequest) {
  const guardError = await applyApiGuards(
    request,
    "admin-ranked-season-hard-reset",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = bodySchema.safeParse(data ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstZodError(parsed.error), fieldErrors: formatZodErrors(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const result = await hardResetRankedSeasonSystem({
      seasonName: parsed.data.seasonName,
      seasonNumber: parsed.data.seasonNumber,
    });

    await logAdminAction({
      adminId: admin!.id,
      action: "RANKED_SEASON_RESET",
      targetType: "ranked_season",
      targetId: result.season.id,
      summary: `[HARD RESET] ${result.deletedSeasons} temporadas removidas, Season 1 recriada`,
      metadata: {
        deletedSeasons: result.deletedSeasons,
        usersReset: result.usersReset,
        newSeasonId: result.season.id,
      },
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof RankedSeasonError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
