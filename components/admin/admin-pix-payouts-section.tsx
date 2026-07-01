"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircle, ExternalLink, Copy, Check, Phone, Mail, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PixIcon } from "@/components/ui/pix-icon";
import { RemoteImage } from "@/components/ui/remote-image";
import { secureApi } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { surfaceInputClass } from "@/lib/ui/theme-surfaces";
import { PIX_PAYOUT_STATUS_LABEL, type AdminPixPayoutRow } from "@/lib/ranked/pix-prize";

type SeasonOption = { id: string; name: string; seasonNumber: number };

type AdminPixPayoutsSectionProps = {
  seasons: SeasonOption[];
};

const STATUS_CLASS: Record<AdminPixPayoutRow["status"], string> = {
  PENDING: "badge-amber text-[10px] uppercase tracking-wide",
  READY: "bg-emerald-500/15 text-emerald-300",
  CONTACTED: "bg-sky-500/15 text-sky-300",
  PAID: "bg-foreground/10 text-muted",
  CANCELLED: "bg-red-500/15 text-red-300",
};

const POSITION_MEDAL = ["🥇", "🥈", "🥉"] as const;

async function copyText(value: string, label: string) {
  if (!value.trim()) return;
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copiado.`);
  } catch {
    toast.error("Não foi possível copiar.");
  }
}

function ContactChip({
  label,
  value,
  href,
  icon: Icon,
}: {
  label: string;
  value: string;
  href?: string;
  icon: typeof Mail;
}) {
  if (!value.trim()) return null;

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-black/15 px-2 py-1 text-xs">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted" />
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate text-primary hover:underline"
        >
          {value}
        </a>
      ) : (
        <span className="truncate text-foreground">{value}</span>
      )}
      <button
        type="button"
        aria-label={`Copiar ${label}`}
        onClick={() => void copyText(value, label)}
        className="ml-1 shrink-0 text-muted hover:text-foreground"
      >
        <Copy className="h-3 w-3" />
      </button>
    </div>
  );
}

function PayoutRow({
  payout,
  updating,
  onUpdate,
}: {
  payout: AdminPixPayoutRow;
  updating: boolean;
  onUpdate: (grantId: string, patch: { status?: AdminPixPayoutRow["status"]; note?: string }) => void;
}) {
  const [noteDraft, setNoteDraft] = useState(payout.payoutNote);
  const avatar = payout.user.avatarUrl ?? payout.user.steamAvatarUrl;

  useEffect(() => {
    setNoteDraft(payout.payoutNote);
  }, [payout.payoutNote]);

  return (
    <article className="rounded-xl border border-border/70 bg-[color-mix(in_srgb,var(--background)_60%,transparent)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]">
            {avatar ? (
              <RemoteImage src={avatar} alt={payout.user.nickname} fill className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-bold text-primary">
                {payout.user.nickname.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-display text-base font-bold text-foreground">{payout.user.nickname}</p>
              <span className="text-sm">{POSITION_MEDAL[payout.position - 1] ?? "🏅"}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  STATUS_CLASS[payout.status],
                )}
              >
                {PIX_PAYOUT_STATUS_LABEL[payout.status]}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-muted">
              {payout.seasonName} · {payout.pixAmountLabel}
            </p>
            <p className="text-xs text-muted">
              Premiado em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(payout.grantedAt))}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {payout.status !== "CONTACTED" && payout.status !== "PAID" && payout.status !== "CANCELLED" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={updating}
              onClick={() => onUpdate(payout.grantId, { status: "CONTACTED" })}
            >
              <MessageCircle className="h-4 w-4" />
              Marcar contato
            </Button>
          ) : null}
          {payout.status !== "PAID" && payout.status !== "CANCELLED" ? (
            <Button
              type="button"
              size="sm"
              variant="primary"
              disabled={updating}
              onClick={() => onUpdate(payout.grantId, { status: "PAID" })}
            >
              <Check className="h-4 w-4" />
              Marcar pago
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">Contato</p>
          <div className="flex flex-wrap gap-2">
            <ContactChip label="E-mail" value={payout.user.email ?? ""} icon={Mail} href={payout.user.email ? `mailto:${payout.user.email}` : undefined} />
            <ContactChip label="Telefone" value={payout.user.phone} icon={Phone} />
            <ContactChip
              label="Discord"
              value={payout.user.discordUsername ?? payout.user.discordUserId ?? ""}
              icon={MessageCircle}
            />
            <ContactChip
              label="Steam"
              value={payout.user.steamPersonaName ?? "Perfil Steam"}
              href={payout.user.steamProfileUrl ?? undefined}
              icon={ExternalLink}
            />
          </div>
        </div>

        <div className="rounded-lg border border-[color-mix(in_srgb,#32BCAD_30%,transparent)] bg-[color-mix(in_srgb,#32BCAD_8%,transparent)] p-3">
          <div className="flex items-start gap-2">
            <PixIcon size={18} />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-pix">Chave Pix</p>
              {payout.user.pixKey ? (
                <>
                  <p className="mt-1 break-all font-mono text-sm text-foreground">{payout.user.pixKey}</p>
                  {payout.user.pixKeyHolderName ? (
                    <p className="mt-1 text-xs text-muted">Titular: {payout.user.pixKeyHolderName}</p>
                  ) : null}
                  {payout.user.pixContactEmail ? (
                    <p className="mt-1 text-xs text-muted">Contato: {payout.user.pixContactEmail}</p>
                  ) : null}
                  {payout.user.pixContactPhone ? (
                    <p className="mt-1 text-xs text-muted">Tel.: {payout.user.pixContactPhone}</p>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => void copyText(payout.user.pixKey, "Chave Pix")}
                  >
                    <Copy className="h-4 w-4" />
                    Copiar chave
                  </Button>
                </>
              ) : (
                <p className="mt-1 text-sm text-warning">
                  Jogador ainda não cadastrou a chave Pix no perfil. Entre em contato para solicitar.
                </p>
              )}
            </div>
          </div>
        </div>

        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
            Nota interna
          </span>
          <div className="flex gap-2">
            <input
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Ex.: Pix enviado em 01/07, comprovante #123"
              className={cn("h-9 min-w-0 flex-1 rounded-lg px-3 text-sm", surfaceInputClass)}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={updating || noteDraft === payout.payoutNote}
              onClick={() => onUpdate(payout.grantId, { note: noteDraft })}
            >
              Salvar
            </Button>
          </div>
        </label>
      </div>
    </article>
  );
}

export function AdminPixPayoutsSection({ seasons }: AdminPixPayoutsSectionProps) {
  const [payouts, setPayouts] = useState<AdminPixPayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [seasonFilter, setSeasonFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminPixPayoutRow["status"] | "">("");

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (seasonFilter) params.set("seasonId", seasonFilter);
    if (statusFilter) params.set("status", statusFilter);
    const query = params.toString();

    secureApi<{ payouts: AdminPixPayoutRow[] }>(
      `/api/admin/ranked/pix-payouts${query ? `?${query}` : ""}`,
    )
      .then((result) => {
        if (result.ok) setPayouts(result.data.payouts);
        else toast.error(result.error);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [seasonFilter, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const pendingCount = useMemo(
    () => payouts.filter((p) => p.status === "PENDING" || p.status === "READY").length,
    [payouts],
  );

  async function handleUpdate(
    grantId: string,
    patch: { status?: AdminPixPayoutRow["status"]; note?: string },
  ) {
    setUpdatingId(grantId);
    const result = await secureApi<{ payout: AdminPixPayoutRow }>(
      `/api/admin/ranked/pix-payouts/${grantId}`,
      { method: "PATCH", json: patch },
    );
    setUpdatingId(null);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    setPayouts((prev) =>
      prev.map((row) => (row.grantId === grantId ? result.data.payout : row)),
    );
    toast.success("Pagamento Pix atualizado.");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">Pagamentos Pix</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Veja quem ganhou prêmio em Pix, entre em contato com os jogadores e marque quando o pagamento for feito.
          </p>
          {pendingCount > 0 ? (
            <p className="mt-2 text-sm font-medium text-warning">
              {pendingCount} pagamento(s) pendente(s)
            </p>
          ) : null}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="block min-w-[12rem]">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
            Temporada
          </span>
          <select
            value={seasonFilter}
            onChange={(e) => setSeasonFilter(e.target.value)}
            className={cn("h-10 w-full rounded-lg px-3 text-sm", surfaceInputClass)}
          >
            <option value="">Todas</option>
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name} (#{season.seasonNumber})
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-[12rem]">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
            Status
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AdminPixPayoutRow["status"] | "")}
            className={cn("h-10 w-full rounded-lg px-3 text-sm", surfaceInputClass)}
          >
            <option value="">Todos</option>
            {(Object.keys(PIX_PAYOUT_STATUS_LABEL) as AdminPixPayoutRow["status"][]).map((status) => (
              <option key={status} value={status}>
                {PIX_PAYOUT_STATUS_LABEL[status]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 motion-safe-spin text-muted" />
        </div>
      ) : payouts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 px-4 py-12 text-center text-sm text-muted">
          Nenhum prêmio Pix registrado ainda. Os pagamentos aparecem aqui quando os prêmios forem entregues ao top 3.
        </div>
      ) : (
        <div className="space-y-4">
          {payouts.map((payout) => (
            <PayoutRow
              key={payout.grantId}
              payout={payout}
              updating={updatingId === payout.grantId}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
