import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { applyApiGuards, parseJsonBody } from "@/lib/security/api-guard";
import { requireAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { RATE_LIMITS } from "@/lib/security/constants";
import { formatZodErrors, firstZodError } from "@/lib/security/schemas";
import { RankedSeasonError, resetRankedSeason } from "@/lib/ranked/season-service";

const prizeSchema = z.object({
  position: z.number().int().min(1).max(3),
  rewardType: z.enum(["COINS", "PIX", "CATALOG_SKIN", "AGENT", "STICKER"]),
  amountCoins: z.number().int().min(0).optional(),
  pixAmountCents: z.number().int().min(0).optional(),
  catalogSkinId: z.string().nullable().optional(),
  agentDefIndex: z.number().int().nullable().optional(),
  stickerDefIndex: z.number().int().nullable().optional(),
  label: z.string().max(120).optional(),
  enabled: z.boolean().optional(),
  highlight: z.boolean().optional(),
});

const nextSeasonSchema = z.object({
  name: z.string().min(1).max(80),
  seasonNumber: z.number().int().min(1).max(999),
  description: z.string().max(500).optional(),
  startsAt: z.string().min(1),
  endsAt: z.string().nullable().optional(),
  resetAt: z.string().nullable().optional(),
  prizes: z.array(prizeSchema).optional(),
});

const resetSchema = z.object({
  grantPrizes: z.boolean().optional(),
  archiveStandings: z.boolean().optional(),
  nextSeason: nextSeasonSchema.optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

function parseDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Date(value);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const guardError = await applyApiGuards(
    request,
    "admin-ranked-season-reset",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await context.params;
  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = resetSchema.safeParse(data ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstZodError(parsed.error), fieldErrors: formatZodErrors(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const result = await resetRankedSeason(id, admin!.id, {
      grantPrizes: parsed.data.grantPrizes,
      archiveStandings: parsed.data.archiveStandings,
      nextSeason: parsed.data.nextSeason
        ? {
            name: parsed.data.nextSeason.name,
            seasonNumber: parsed.data.nextSeason.seasonNumber,
            description: parsed.data.nextSeason.description,
            startsAt: new Date(parsed.data.nextSeason.startsAt),
            endsAt: parsed.data.nextSeason.endsAt
              ? new Date(parsed.data.nextSeason.endsAt)
              : null,
            resetAt: parsed.data.nextSeason.resetAt
              ? new Date(parsed.data.nextSeason.resetAt)
              : null,
            prizes: parsed.data.nextSeason.prizes,
          }
        : undefined,
    });

    await logAdminAction({
      adminId: admin!.id,
      action: "RANKED_SEASON_RESET",
      targetType: "ranked_season",
      targetId: id,
      summary: `Resetou temporada (stats reset: ${result.statsReset ? "sim" : "não"})`,
      metadata: {
        nextSeasonId: result.nextSeason?.id ?? null,
        grantPrizes: parsed.data.grantPrizes ?? true,
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
