import "server-only";

import type { AnticheatReviewStatus, Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveSteamDisplayName, STEAM_DISPLAY_NAME_SELECT } from "@/lib/steam/display-name";

export type AnticheatReviewCaseRow = {
  id: string;
  userId: string | null;
  steamId: string;
  nickname: string;
  displayName: string;
  steamPersonaName: string | null;
  plan: string | null;
  matchId: string | null;
  demoUrl: string | null;
  reason: string;
  evidence: unknown;
  severity: number;
  status: AnticheatReviewStatus;
  adminNotes: string;
  resolvedById: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  userAvatarUrl: string | null;
};

export async function listAnticheatReviewCases(params: {
  status?: AnticheatReviewStatus;
  limit?: number;
}): Promise<AnticheatReviewCaseRow[]> {
  const rows = await prisma.anticheatReviewCase.findMany({
    where: params.status ? { status: params.status } : undefined,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: params.limit ?? 100,
    include: {
      user: {
        select: {
          avatarUrl: true,
          steamAvatarUrl: true,
          plan: true,
          ...STEAM_DISPLAY_NAME_SELECT,
        },
      },
    },
  });

  return rows.map((row) => {
    const nickname = row.nickname || row.user?.nickname || "—";
    const displayName = row.user ? resolveSteamDisplayName(row.user) : nickname;

    return {
      id: row.id,
      userId: row.userId,
      steamId: row.steamId,
      nickname,
      displayName,
      steamPersonaName: row.user?.steamPersonaName ?? null,
      plan: row.user?.plan?.toLowerCase() ?? null,
      matchId: row.matchId,
      demoUrl: row.demoUrl,
      reason: row.reason,
      evidence: row.evidence,
      severity: row.severity,
      status: row.status,
      adminNotes: row.adminNotes,
      resolvedById: row.resolvedById,
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      userAvatarUrl: row.user?.avatarUrl ?? row.user?.steamAvatarUrl ?? null,
    };
  });
}

export async function createAnticheatReviewCase(input: {
  userId?: string | null;
  steamId?: string;
  nickname?: string;
  matchId?: string | null;
  demoUrl?: string | null;
  reason: string;
  evidence?: Prisma.InputJsonValue;
  severity?: number;
}) {
  let steamId = input.steamId?.trim() ?? "";
  let nickname = input.nickname?.trim() ?? "";
  let userId = input.userId ?? null;

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { steamId: true, nickname: true },
    });
    if (user) {
      steamId = user.steamId ?? steamId;
      nickname = user.nickname;
    }
  }

  return prisma.anticheatReviewCase.create({
    data: {
      userId,
      steamId,
      nickname,
      matchId: input.matchId ?? null,
      demoUrl: input.demoUrl ?? null,
      reason: input.reason.trim().slice(0, 500),
      evidence: input.evidence ?? undefined,
      severity: Math.min(5, Math.max(1, input.severity ?? 2)),
    },
  });
}

export async function updateAnticheatReviewCase(
  caseId: string,
  adminId: string,
  patch: {
    status?: AnticheatReviewStatus;
    adminNotes?: string;
    severity?: number;
  },
) {
  const resolvedStatuses: AnticheatReviewStatus[] = ["CLEARED", "CONFIRMED", "DISMISSED"];
  const data: Prisma.AnticheatReviewCaseUpdateInput = {};

  if (patch.adminNotes !== undefined) {
    data.adminNotes = patch.adminNotes.trim().slice(0, 2000);
  }
  if (patch.severity !== undefined) {
    data.severity = Math.min(5, Math.max(1, patch.severity));
  }
  if (patch.status !== undefined) {
    data.status = patch.status;
    if (patch.status === "UNDER_REVIEW") {
      data.resolvedAt = null;
      data.resolvedBy = { disconnect: true };
    }
    if (resolvedStatuses.includes(patch.status)) {
      data.resolvedAt = new Date();
      data.resolvedBy = { connect: { id: adminId } };
    }
  }

  return prisma.anticheatReviewCase.update({
    where: { id: caseId },
    data,
  });
}
