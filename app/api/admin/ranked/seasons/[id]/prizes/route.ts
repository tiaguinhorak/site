import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { applyApiGuards, parseJsonBody } from "@/lib/security/api-guard";
import { requireAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { RATE_LIMITS } from "@/lib/security/constants";
import { formatZodErrors, firstZodError } from "@/lib/security/schemas";
import { RankedSeasonError, upsertRankedSeasonPrizes } from "@/lib/ranked/season-service";

const prizeSchema = z.object({
  id: z.string().optional(),
  position: z.number().int().min(1).max(3),
  sortOrder: z.number().int().min(0).optional(),
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

const bodySchema = z.object({
  prizes: z.array(prizeSchema).min(1).max(30),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  const guardError = await applyApiGuards(
    request,
    "admin-ranked-season-prizes",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await context.params;
  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = bodySchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstZodError(parsed.error), fieldErrors: formatZodErrors(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const season = await upsertRankedSeasonPrizes(id, parsed.data.prizes);

    await logAdminAction({
      adminId: admin!.id,
      action: "RANKED_SEASON_PRIZES_UPDATE",
      targetType: "ranked_season",
      targetId: id,
      summary: "Atualizou premiações do top 3",
    });

    return NextResponse.json({ ok: true, season });
  } catch (err) {
    if (err instanceof RankedSeasonError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
