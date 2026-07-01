import "server-only";

import type { RankedSeasonPixPayoutStatus } from "@/lib/ranked/pix-prize";
import type { AdminPixPayoutRow, UserPendingPixPrize } from "@/lib/ranked/pix-prize";
import { prisma } from "@/lib/prisma";
import { decryptPixFields } from "@/lib/pix/pix-profile-service";
import { formatBrazilPhone, formatPixKeyInput } from "@/lib/pix/pix-key-utils";
import { decryptField } from "@/lib/security/field-encryption";
import { formatPixAmount } from "@/lib/ranked/pix-prize";

export type { AdminPixPayoutRow, UserPendingPixPrize } from "@/lib/ranked/pix-prize";

export function resolvePixPayoutStatusForUser(
  pixKey: string,
): RankedSeasonPixPayoutStatus {
  return pixKey.trim() ? "READY" : "PENDING";
}

export async function syncUserPixGrantStatuses(userId: string, pixKey: string) {
  const nextStatus = resolvePixPayoutStatusForUser(pixKey);
  await prisma.rankedSeasonPrizeGrant.updateMany({
    where: {
      userId,
      rewardType: "PIX",
      pixPayoutStatus: { in: ["PENDING", "READY"] },
    },
    data: {
      pixPayoutStatus: nextStatus,
    },
  });
}

export async function listAdminPixPayouts(params: {
  seasonId?: string;
  status?: RankedSeasonPixPayoutStatus;
}): Promise<AdminPixPayoutRow[]> {
  const grants = await prisma.rankedSeasonPrizeGrant.findMany({
    where: {
      rewardType: "PIX",
      ...(params.seasonId ? { seasonId: params.seasonId } : {}),
      ...(params.status ? { pixPayoutStatus: params.status } : {}),
    },
    orderBy: [{ grantedAt: "desc" }],
    include: {
      season: { select: { id: true, name: true, seasonNumber: true } },
      user: {
        select: {
          id: true,
          nickname: true,
          email: true,
          phone: true,
          pixKey: true,
          pixKeyType: true,
          pixKeyHolderName: true,
          pixContactEmail: true,
          pixContactPhone: true,
          discordUsername: true,
          discordUserId: true,
          steamPersonaName: true,
          steamProfileUrl: true,
          avatarUrl: true,
          steamAvatarUrl: true,
        },
      },
    },
  });

  return grants.map((grant) => {
    const pix = decryptPixFields(grant.user);
    return {
      grantId: grant.id,
      seasonId: grant.seasonId,
      seasonName: grant.season.name,
      seasonNumber: grant.season.seasonNumber,
      position: grant.position,
      pixAmountCents: grant.pixAmountCents,
      pixAmountLabel: formatPixAmount(grant.pixAmountCents),
      label: grant.label,
      grantedAt: grant.grantedAt.toISOString(),
      status: grant.pixPayoutStatus ?? "PENDING",
      payoutNote: grant.pixPayoutNote,
      contactedAt: grant.pixContactedAt?.toISOString() ?? null,
      paidAt: grant.pixPaidAt?.toISOString() ?? null,
      user: {
        id: grant.user.id,
        nickname: grant.user.nickname,
        email: grant.user.email,
        phone: grant.user.phone,
        pixKey: formatPixKeyInput(pix.pixKeyType, pix.pixKey),
        pixKeyHolderName: pix.pixKeyHolderName,
        pixContactEmail: pix.pixContactEmail,
        pixContactPhone: formatBrazilPhone(pix.pixContactPhone),
        discordUsername: grant.user.discordUsername,
        discordUserId: grant.user.discordUserId,
        steamPersonaName: grant.user.steamPersonaName,
        steamProfileUrl: grant.user.steamProfileUrl,
        avatarUrl: grant.user.avatarUrl,
        steamAvatarUrl: grant.user.steamAvatarUrl,
      },
    };
  });
}

export async function updatePixPayoutGrant(
  grantId: string,
  input: {
    status?: RankedSeasonPixPayoutStatus;
    note?: string;
    adminId: string;
  },
): Promise<AdminPixPayoutRow | null> {
  const existing = await prisma.rankedSeasonPrizeGrant.findUnique({
    where: { id: grantId },
    select: { id: true, rewardType: true, userId: true, pixAmountCents: true, seasonId: true },
  });
  if (!existing || existing.rewardType !== "PIX") return null;

  const now = new Date();
  const data: {
    pixPayoutStatus?: RankedSeasonPixPayoutStatus;
    pixPayoutNote?: string;
    pixContactedAt?: Date | null;
    pixPaidAt?: Date | null;
  } = {};

  if (input.note !== undefined) {
    data.pixPayoutNote = input.note.trim().slice(0, 500);
  }

  if (input.status !== undefined) {
    data.pixPayoutStatus = input.status;
    if (input.status === "CONTACTED") {
      data.pixContactedAt = now;
    } else if (input.status === "PAID") {
      data.pixPaidAt = now;
    } else if (input.status === "PENDING" || input.status === "READY") {
      data.pixContactedAt = null;
      data.pixPaidAt = null;
    }
  }

  await prisma.rankedSeasonPrizeGrant.update({
    where: { id: grantId },
    data,
  });

  if (input.status === "PAID") {
    const season = await prisma.rankedSeason.findUnique({
      where: { id: existing.seasonId },
      select: { name: true },
    });
    const amount = formatPixAmount(existing.pixAmountCents);
    await prisma.notification.create({
      data: {
        userId: existing.userId,
        title: "Pix recebido",
        body: `Seu prêmio de ${amount} da temporada ${season?.name ?? ""} foi pago via Pix. Obrigado por jogar conosco!`,
        type: "SYSTEM",
        params: {
          grantId,
          seasonId: existing.seasonId,
          pixAmountCents: existing.pixAmountCents,
          action: "ranking",
        },
      },
    });
  }

  const rows = await listAdminPixPayouts({});
  return rows.find((row) => row.grantId === grantId) ?? null;
}

export async function listUserPixPrizes(userId: string): Promise<UserPendingPixPrize[]> {
  const grants = await prisma.rankedSeasonPrizeGrant.findMany({
    where: { userId, rewardType: "PIX" },
    orderBy: { grantedAt: "desc" },
    include: {
      season: { select: { name: true } },
      user: { select: { pixKey: true, pixKeyType: true, pixKeyHolderName: true, pixContactEmail: true, pixContactPhone: true } },
    },
  });

  return grants.map((grant) => {
    const status = grant.pixPayoutStatus ?? "PENDING";
    const hasKey = Boolean(decryptField(grant.user.pixKey).trim());
    return {
      grantId: grant.id,
      seasonName: grant.season.name,
      position: grant.position,
      pixAmountCents: grant.pixAmountCents,
      pixAmountLabel: formatPixAmount(grant.pixAmountCents),
      status,
      grantedAt: grant.grantedAt.toISOString(),
      needsPixKey: !hasKey && status !== "PAID" && status !== "CANCELLED",
    };
  });
}
