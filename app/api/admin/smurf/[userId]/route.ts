import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  applyApiGuards,
  jsonError,
  parseJsonBody,
} from "@/lib/security/api-guard";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { RATE_LIMITS } from "@/lib/security/constants";
import { firstZodError } from "@/lib/security/schemas";
import { logAdminAction } from "@/lib/admin/audit";
import { refreshSmurfProfile } from "@/lib/anti-smurf/service";

const patchSchema = z.object({
  action: z.enum(["clear", "review", "flag", "confirm"]),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { userId } = await context.params;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nickname: true,
      smurfStatus: true,
      smurfRiskScore: true,
      rankedSmurfHoldUntil: true,
      steamAccountCreatedAt: true,
      steamLinkedAt: true,
      createdAt: true,
      elo: true,
      rankedWins: true,
      rankedLosses: true,
    },
  });
  if (!user) return jsonError(404, "Usuário não encontrado.");

  const [signals, fingerprints] = await Promise.all([
    prisma.smurfSignal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.accountFingerprint.findMany({
      where: { userId },
      orderBy: { lastSeenAt: "desc" },
      take: 10,
    }),
  ]);

  return NextResponse.json({ user, signals, fingerprints });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  const guardError = await applyApiGuards(
    request,
    "admin-smurf-update",
    RATE_LIMITS.profile.limit,
    RATE_LIMITS.profile.windowMs,
  );
  if (guardError) return guardError;

  const { user: admin, error } = await requireAdmin(request);
  if (error) return error;

  const { userId } = await context.params;
  const { data, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  const parsed = patchSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });
  }

  const statusMap = {
    clear: "CLEAR",
    review: "REVIEW",
    flag: "FLAGGED",
    confirm: "CONFIRMED",
  } as const;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      smurfStatus: statusMap[parsed.data.action],
      ...(parsed.data.action === "clear"
        ? {
            smurfRiskScore: 0,
            rankedSmurfHoldUntil: null,
          }
        : {}),
    },
    select: {
      id: true,
      nickname: true,
      smurfStatus: true,
      smurfRiskScore: true,
      rankedSmurfHoldUntil: true,
    },
  });

  if (parsed.data.action === "clear") {
    await prisma.smurfSignal.updateMany({
      where: { userId, resolved: false },
      data: { resolved: true },
    });
  } else {
    await refreshSmurfProfile(userId);
  }

  await logAdminAction({
    adminId: admin!.id,
    action: "SMURF_STATUS_UPDATE",
    targetType: "user",
    targetId: userId,
    summary: `Anti-smurf: ${parsed.data.action} em ${updated.nickname}`,
  });

  return NextResponse.json({ ok: true, user: updated });
}
