import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyApiGuards,
  jsonError,
  parseJsonBody,
} from "@/lib/security/api-guard";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { RATE_LIMITS } from "@/lib/security/constants";
import { logAdminAction } from "@/lib/admin/audit";
import {
  formatZodErrors,
  firstZodError,
} from "@/lib/security/schemas";
import { adminRankedQueueRestrictSchema } from "@/lib/admin/schemas";
import { adminApplyRankedQueueRestriction } from "@/lib/ranked/queue-restriction";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guardError = applyApiGuards(
    request,
    "admin-ranked-queue-restrict",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { id: userId } = await context.params;
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) {
    return jsonError(404, "Usuário não encontrado.");
  }

  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = adminRankedQueueRestrictSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: firstZodError(parsed.error),
        fieldErrors: formatZodErrors(parsed.error),
      },
      { status: 400 },
    );
  }

  const restriction = await adminApplyRankedQueueRestriction(
    userId,
    admin!.id,
    parsed.data.minutes,
    parsed.data.reason,
    parsed.data.incrementDodge,
  );

  await logAdminAction({
    adminId: admin!.id,
    action: "RANKED_QUEUE_RESTRICT",
    targetType: "user",
    targetId: userId,
    summary: `Restringiu fila rankeada de ${target.nickname} por ${parsed.data.minutes} min`,
    metadata: {
      minutes: parsed.data.minutes,
      reason: parsed.data.reason,
      incrementDodge: parsed.data.incrementDodge,
    },
  });

  return NextResponse.json({ ok: true, restriction });
}
