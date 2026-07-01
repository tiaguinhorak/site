import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { applyApiGuards, parseJsonBody } from "@/lib/security/api-guard";
import { requireAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { RATE_LIMITS } from "@/lib/security/constants";
import { formatZodErrors, firstZodError } from "@/lib/security/schemas";
import { updatePixPayoutGrant } from "@/lib/ranked/pix-payout-service";

const bodySchema = z.object({
  status: z.enum(["PENDING", "READY", "CONTACTED", "PAID", "CANCELLED"]).optional(),
  note: z.string().max(500).optional(),
});

type RouteContext = { params: Promise<{ grantId: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const guardError = await applyApiGuards(
    request,
    "admin-ranked-pix-payout-update",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { grantId } = await context.params;
  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = bodySchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstZodError(parsed.error), fieldErrors: formatZodErrors(parsed.error) },
      { status: 400 },
    );
  }

  if (parsed.data.status === undefined && parsed.data.note === undefined) {
    return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
  }

  const payout = await updatePixPayoutGrant(grantId, {
    status: parsed.data.status,
    note: parsed.data.note,
    adminId: admin!.id,
  });

  if (!payout) {
    return NextResponse.json({ error: "Prêmio Pix não encontrado." }, { status: 404 });
  }

  await logAdminAction({
    adminId: admin!.id,
    action: "RANKED_SEASON_PIX_PAYOUT_UPDATE",
    targetType: "ranked_season_prize_grant",
    targetId: grantId,
    summary: `Atualizou pagamento Pix (${parsed.data.status ?? "nota"})`,
  });

  return NextResponse.json({ ok: true, payout });
}
