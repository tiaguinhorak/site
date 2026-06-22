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
import { adminRankedQueueClearSchema } from "@/lib/admin/schemas";
import { adminClearRankedQueueRestriction } from "@/lib/ranked/queue-restriction";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guardError = await applyApiGuards(
    request,
    "admin-ranked-queue-clear",
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

  const parsed = adminRankedQueueClearSchema.safeParse(data ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: firstZodError(parsed.error),
        fieldErrors: formatZodErrors(parsed.error),
      },
      { status: 400 },
    );
  }

  const restriction = await adminClearRankedQueueRestriction(
    userId,
    admin!.id,
    parsed.data.resetDodges,
  );

  await logAdminAction({
    adminId: admin!.id,
    action: "RANKED_QUEUE_CLEAR",
    targetType: "user",
    targetId: userId,
    summary: parsed.data.resetDodges
      ? `Limpou restrição e strikes de fila de ${target.nickname}`
      : `Removeu restrição ativa de fila de ${target.nickname}`,
    metadata: { resetDodges: parsed.data.resetDodges },
  });

  return NextResponse.json({ ok: true, restriction });
}
