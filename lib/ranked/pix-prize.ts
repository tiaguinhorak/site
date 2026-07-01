/** Cor oficial aproximada do Pix (BACEN). */
export const PIX_BRAND_COLOR = "#32BCAD";

export function formatPixAmount(pixAmountCents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(pixAmountCents / 100);
}

export function pixPrizeLabel(pixAmountCents: number): string {
  return `${formatPixAmount(pixAmountCents)} via Pix`;
}

export function defaultPixAmountCents(position: number): number {
  if (position === 1) return 50_000;
  if (position === 2) return 30_000;
  return 15_000;
}

export function parsePixInputToCents(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return Math.max(1, Math.round(raw * 100));
}

export const PIX_PRIZE_DESCRIPTION =
  "Pagamento em Pix realizado pela equipe após o encerramento da temporada.";

export type RankedSeasonPixPayoutStatus =
  | "PENDING"
  | "READY"
  | "CONTACTED"
  | "PAID"
  | "CANCELLED";

export const PIX_PAYOUT_STATUS_LABEL: Record<RankedSeasonPixPayoutStatus, string> = {
  PENDING: "Aguardando chave Pix",
  READY: "Pronto para pagar",
  CONTACTED: "Contato feito",
  PAID: "Pago",
  CANCELLED: "Cancelado",
};

export type AdminPixPayoutRow = {
  grantId: string;
  seasonId: string;
  seasonName: string;
  seasonNumber: number;
  position: number;
  pixAmountCents: number;
  pixAmountLabel: string;
  label: string;
  grantedAt: string;
  status: RankedSeasonPixPayoutStatus;
  payoutNote: string;
  contactedAt: string | null;
  paidAt: string | null;
  user: {
    id: string;
    nickname: string;
    email: string | null;
    phone: string;
    pixKey: string;
    pixKeyHolderName: string;
    discordUsername: string | null;
    discordUserId: string | null;
    steamPersonaName: string | null;
    steamProfileUrl: string | null;
    avatarUrl: string | null;
    steamAvatarUrl: string | null;
  };
};

export type UserPendingPixPrize = {
  grantId: string;
  seasonName: string;
  position: number;
  pixAmountCents: number;
  pixAmountLabel: string;
  status: RankedSeasonPixPayoutStatus;
  grantedAt: string;
  needsPixKey: boolean;
};
