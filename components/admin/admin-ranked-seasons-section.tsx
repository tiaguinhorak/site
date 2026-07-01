"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Loader2,
  Medal,
  Plus,
  RefreshCw,
  RotateCcw,
  Trophy,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { secureApi } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { SocialUserName } from "@/components/social/social-user-name";
import { surfaceInputClass } from "@/lib/ui/theme-surfaces";
import {
  AdminRankedSeasonPrizesEditor,
  buildPrizeDraftsFromSeason,
} from "@/components/admin/admin-ranked-season-prizes-editor";
import { AdminPixPayoutsSection } from "@/components/admin/admin-pix-payouts-section";

type SeasonRow = {
  id: string;
  code: string;
  name: string;
  seasonNumber: number;
  description: string;
  startsAt: string;
  endsAt: string | null;
  resetAt: string | null;
  status: "DRAFT" | "ACTIVE" | "ENDED" | "ARCHIVED";
  active: boolean;
  standingsCount?: number;
  prizeGrantsCount?: number;
  prizes: Array<{
    id?: string;
    position: number;
    sortOrder?: number;
    rewardType: "COINS" | "PIX" | "CATALOG_SKIN" | "AGENT" | "STICKER";
    amountCoins: number;
    pixAmountCents?: number;
    catalogSkinId: string | null;
    agentDefIndex: number | null;
    stickerDefIndex: number | null;
    label: string;
    enabled: boolean;
    previewImageUrl?: string | null;
  }>;
};

type StandingRow = {
  position: number;
  nickname: string;
  displayName?: string;
  competitivePoints: number;
  elo: number;
  rankedWins: number;
  rankedLosses: number;
};

type SeasonForm = {
  name: string;
  seasonNumber: number;
  description: string;
  startsAt: string;
  endsAt: string;
  resetAt: string;
};

const STATUS_LABEL: Record<SeasonRow["status"], string> = {
  DRAFT: "Rascunho",
  ACTIVE: "Ativa",
  ENDED: "Encerrada",
  ARCHIVED: "Arquivada",
};

const STATUS_CLASS: Record<SeasonRow["status"], string> = {
  DRAFT: "bg-muted/20 text-muted",
  ACTIVE: "bg-emerald-500/15 text-emerald-400",
  ENDED: "badge-amber text-[10px] uppercase tracking-wide",
  ARCHIVED: "bg-foreground/10 text-muted",
};

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string): string | null {
  if (!value.trim()) return null;
  return new Date(value).toISOString();
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

function defaultForm(nextNumber: number): SeasonForm {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const local = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  return {
    name: `Season ${nextNumber}`,
    seasonNumber: nextNumber,
    description: "",
    startsAt: local,
    endsAt: "",
    resetAt: local,
  };
}

const textInputClass = cn("h-10 w-full min-w-0 rounded-lg px-3 text-sm", surfaceInputClass);

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn("h-10 w-full min-w-0 rounded-lg px-3 text-sm", surfaceInputClass)}
      />
    </label>
  );
}

export function AdminRankedSeasonsSection() {
  const [view, setView] = useState<"seasons" | "pix">("seasons");
  const [seasons, setSeasons] = useState<SeasonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<SeasonForm>(() => defaultForm(2));
  const [editForm, setEditForm] = useState<SeasonForm | null>(null);
  const [resetNextSeason, setResetNextSeason] = useState(true);
  const [resetForm, setResetForm] = useState<SeasonForm>(() => defaultForm(2));
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [standingsLoading, setStandingsLoading] = useState(false);
  const [hardResetting, setHardResetting] = useState(false);

  const activeSeason = useMemo(() => seasons.find((s) => s.active), [seasons]);
  const selected = useMemo(
    () => seasons.find((s) => s.id === selectedId) ?? null,
    [seasons, selectedId],
  );

  const selectedPrizeDrafts = useMemo(
    () => (selected ? buildPrizeDraftsFromSeason(selected.prizes) : []),
    [selected],
  );

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/ranked/seasons", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { seasons: SeasonRow[] }) => {
        setSeasons(data.seasons);
        const nextNum =
          Math.max(0, ...data.seasons.map((s) => s.seasonNumber)) + 1;
        setCreateForm(defaultForm(nextNum));
        setResetForm(defaultForm(nextNum));
        if (!selectedId && data.seasons.length > 0) {
          const active = data.seasons.find((s) => s.active);
          setSelectedId(active?.id ?? data.seasons[0]!.id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selected) {
      setEditForm(null);
      return;
    }
    setEditForm({
      name: selected.name,
      seasonNumber: selected.seasonNumber,
      description: selected.description,
      startsAt: toDatetimeLocal(selected.startsAt),
      endsAt: toDatetimeLocal(selected.endsAt),
      resetAt: toDatetimeLocal(selected.resetAt),
    });
  }, [selected]);

  async function loadStandings(seasonId: string) {
    setStandingsLoading(true);
    try {
      const res = await fetch(`/api/ranked/season/${seasonId}/standings?limit=20`, {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { standings: StandingRow[] };
      setStandings(data.standings);
    } catch {
      setStandings([]);
    } finally {
      setStandingsLoading(false);
    }
  }

  useEffect(() => {
    if (selected?.id) void loadStandings(selected.id);
  }, [selected?.id]);

  async function createSeason(activate: boolean) {
    setCreating(true);
    const result = await secureApi("/api/admin/ranked/seasons", {
      method: "POST",
      json: {
        name: createForm.name.trim(),
        seasonNumber: createForm.seasonNumber,
        description: createForm.description.trim(),
        startsAt: fromDatetimeLocal(createForm.startsAt),
        endsAt: fromDatetimeLocal(createForm.endsAt),
        resetAt: fromDatetimeLocal(createForm.resetAt),
        activate,
      },
    });
    setCreating(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(activate ? "Temporada criada e ativada." : "Temporada criada.");
    load();
  }

  async function saveEdit() {
    if (!selected || !editForm) return;
    setSavingEdit(true);
    const result = await secureApi(`/api/admin/ranked/seasons/${selected.id}`, {
      method: "PUT",
      json: {
        name: editForm.name.trim(),
        seasonNumber: editForm.seasonNumber,
        description: editForm.description.trim(),
        startsAt: fromDatetimeLocal(editForm.startsAt),
        endsAt: fromDatetimeLocal(editForm.endsAt),
        resetAt: fromDatetimeLocal(editForm.resetAt),
      },
    });
    setSavingEdit(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Temporada atualizada.");
    load();
  }

  async function activateSeason(id: string) {
    setActionId(id);
    const result = await secureApi(`/api/admin/ranked/seasons/${id}/activate`, {
      method: "POST",
    });
    setActionId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Temporada ativada.");
    load();
  }

  async function grantPrizes(id: string) {
    setActionId(id);
    const result = await secureApi(`/api/admin/ranked/seasons/${id}/grant-prizes`, {
      method: "POST",
    });
    setActionId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Premiações processadas.");
    load();
    void loadStandings(id);
  }

  async function resetSeason(id: string) {
    setActionId(id);
    const body: Record<string, unknown> = {
      grantPrizes: true,
      archiveStandings: true,
    };
    if (resetNextSeason) {
      body.nextSeason = {
        name: resetForm.name.trim(),
        seasonNumber: resetForm.seasonNumber,
        description: resetForm.description.trim(),
        startsAt: fromDatetimeLocal(resetForm.startsAt),
        endsAt: fromDatetimeLocal(resetForm.endsAt),
        resetAt: fromDatetimeLocal(resetForm.resetAt),
      };
    }
    const result = await secureApi(`/api/admin/ranked/seasons/${id}/reset`, {
      method: "POST",
      json: body,
    });
    setActionId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(
      resetNextSeason
        ? "Temporada resetada, prêmios entregues e nova season iniciada."
        : "Temporada resetada e ranking zerado.",
    );
    load();
  }

  async function hardResetAllSeasons() {
    const confirmed = window.confirm(
      "ATENÇÃO: apaga TODAS as temporadas, rankings arquivados, placements e zera ELO/pontos de TODOS os jogadores. Cria uma Season 1 nova. Esta ação não pode ser desfeita. Continuar?",
    );
    if (!confirmed) return;

    setHardResetting(true);
    const result = await secureApi("/api/admin/ranked/seasons/hard-reset", {
      method: "POST",
      json: { confirm: "RESET_ALL_SEASONS", seasonName: "Season 1", seasonNumber: 1 },
    });
    setHardResetting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Sistema de temporadas reiniciado. Season 1 ativa com ranking zerado.");
    setSelectedId(null);
    setStandings([]);
    load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 motion-safe-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold text-foreground">Temporadas rankeadas</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Gerencie seasons do ranking: datas de início/fim/reset, arquivamento do top, zerar ELO e
            pontos, premiação do top 3 e pagamentos Pix.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border/50 pb-1">
        {(
          [
            ["seasons", "Temporadas"],
            ["pix", "Pagamentos Pix"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={cn(
              "rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors",
              view === id
                ? "bg-primary/15 text-primary"
                : "text-muted hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "pix" ? (
        <AdminPixPayoutsSection
          seasons={seasons.map((season) => ({
            id: season.id,
            name: season.name,
            seasonNumber: season.seasonNumber,
          }))}
        />
      ) : (
        <>

      <section className="rounded-card glass space-y-3 border border-red-500/30 p-4">
        <div>
          <h2 className="font-display text-sm font-bold text-red-300">Reset total do sistema</h2>
          <p className="mt-1 text-xs text-muted">
            Use se as temporadas ficaram inconsistentes (mesmos jogadores em seasons diferentes sem
            reset real). Apaga todo o histórico de seasons e começa do zero com Season 1.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-red-500/40 text-red-300 hover:bg-red-500/10"
          disabled={hardResetting}
          onClick={() => void hardResetAllSeasons()}
        >
          {hardResetting ? (
            <Loader2 className="h-4 w-4 motion-safe-spin" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
          Apagar tudo e reiniciar Season 1
        </Button>
      </section>

      {activeSeason ? (
        <section className="rounded-card glass border border-emerald-500/25 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Trophy className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Temporada ativa</p>
              <p className="font-display text-lg font-bold text-foreground">
                {activeSeason.name} (#{activeSeason.seasonNumber})
              </p>
            </div>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                STATUS_CLASS.ACTIVE,
              )}
            >
              {STATUS_LABEL.ACTIVE}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-black/20 px-3 py-2">
              <p className="text-[11px] uppercase text-muted">Início</p>
              <p className="text-sm tabular-nums">{formatDate(activeSeason.startsAt)}</p>
            </div>
            <div className="rounded-lg bg-black/20 px-3 py-2">
              <p className="text-[11px] uppercase text-muted">Fim previsto</p>
              <p className="text-sm tabular-nums">{formatDate(activeSeason.endsAt)}</p>
            </div>
            <div className="rounded-lg bg-black/20 px-3 py-2">
              <p className="text-[11px] uppercase text-muted">Reset agendado</p>
              <p className="text-sm tabular-nums">{formatDate(activeSeason.resetAt)}</p>
            </div>
          </div>
        </section>
      ) : (
        <section className="alert-warning p-4 text-sm">
          Nenhuma temporada ativa. Crie uma nova ou ative um rascunho.
        </section>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
        <div className="space-y-4">
          <section className="rounded-card glass p-4">
            <div className="mb-3 flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              <h2 className="font-display text-sm font-bold">Nova temporada</h2>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Nome
                </span>
                <input
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  className={textInputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Número
                </span>
                <input
                  type="number"
                  min={1}
                  value={createForm.seasonNumber}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, seasonNumber: Number(e.target.value) }))
                  }
                  className={cn(textInputClass, "tabular-nums")}
                />
              </label>
              <DateField
                label="Início"
                value={createForm.startsAt}
                onChange={(startsAt) => setCreateForm((f) => ({ ...f, startsAt }))}
              />
              <DateField
                label="Fim (opcional)"
                value={createForm.endsAt}
                onChange={(endsAt) => setCreateForm((f) => ({ ...f, endsAt }))}
              />
              <DateField
                label="Data de reset (referência)"
                value={createForm.resetAt}
                onChange={(resetAt) => setCreateForm((f) => ({ ...f, resetAt }))}
              />
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Descrição
                </span>
                <input
                  value={createForm.description}
                  onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                  className={textInputClass}
                />
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button type="button" size="sm" disabled={creating} onClick={() => createSeason(false)}>
                  {creating ? <Loader2 className="h-4 w-4 motion-safe-spin" /> : null}
                  Criar rascunho
                </Button>
                <Button type="button" size="sm" disabled={creating} onClick={() => createSeason(true)}>
                  <Zap className="h-4 w-4" />
                  Criar e ativar
                </Button>
              </div>
            </div>
          </section>

          <section className="rounded-card glass overflow-hidden">
            <div className="border-b border-border/40 px-4 py-3">
              <h2 className="font-display text-sm font-bold">Histórico</h2>
            </div>
            <ul className="divide-y divide-border/30">
              {seasons.map((season) => (
                <li key={season.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(season.id)}
                    className={cn(
                      "flex w-full flex-col gap-1 px-4 py-3 text-left transition hover:bg-white/[0.03]",
                      selectedId === season.id && "bg-primary/10",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">{season.name}</span>
                      <span className="text-xs text-muted">#{season.seasonNumber}</span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                          STATUS_CLASS[season.status],
                        )}
                      >
                        {season.active ? "ATIVA" : STATUS_LABEL[season.status]}
                      </span>
                    </div>
                    <p className="text-xs text-muted">
                      {formatDate(season.startsAt)}
                      {season.resetAt ? ` · reset ${formatDate(season.resetAt)}` : ""}
                      {season.standingsCount ? ` · ${season.standingsCount} no ranking` : ""}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="space-y-4">
          {selected && editForm ? (
            <>
              <section className="rounded-card glass space-y-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-display text-sm font-bold">Editar {selected.name}</h2>
                  <div className="flex flex-wrap gap-2">
                    {!selected.active && selected.status !== "ARCHIVED" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={actionId === selected.id}
                        onClick={() => activateSeason(selected.id)}
                      >
                        {actionId === selected.id ? (
                          <Loader2 className="h-4 w-4 motion-safe-spin" />
                        ) : (
                          <Zap className="h-4 w-4" />
                        )}
                        Ativar
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      disabled={savingEdit}
                      onClick={saveEdit}
                    >
                      {savingEdit ? (
                        <Loader2 className="h-4 w-4 motion-safe-spin" />
                      ) : (
                        <Calendar className="h-4 w-4" />
                      )}
                      Salvar datas
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Nome
                    </span>
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => f && { ...f, name: e.target.value })}
                      className={textInputClass}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Número
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={editForm.seasonNumber}
                      onChange={(e) =>
                        setEditForm(
                          (f) => f && { ...f, seasonNumber: Number(e.target.value) },
                        )
                      }
                      className={cn(textInputClass, "tabular-nums")}
                    />
                  </label>
                  <DateField
                    label="Início"
                    value={editForm.startsAt}
                    onChange={(startsAt) => setEditForm((f) => f && { ...f, startsAt })}
                  />
                  <DateField
                    label="Fim"
                    value={editForm.endsAt}
                    onChange={(endsAt) => setEditForm((f) => f && { ...f, endsAt })}
                  />
                  <DateField
                    label="Reset agendado"
                    value={editForm.resetAt}
                    onChange={(resetAt) => setEditForm((f) => f && { ...f, resetAt })}
                  />
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Descrição
                    </span>
                    <input
                      value={editForm.description}
                      onChange={(e) =>
                        setEditForm((f) => f && { ...f, description: e.target.value })
                      }
                      className={textInputClass}
                    />
                  </label>
                </div>
              </section>

              <section className="rounded-card glass p-4">
                <AdminRankedSeasonPrizesEditor
                  seasonId={selected.id}
                  initialPrizes={selectedPrizeDrafts}
                  onSaved={() => {
                    toast.success("Premiações salvas.");
                    load();
                  }}
                  onError={(message) => toast.error(message)}
                />
              </section>

              {selected.status !== "ARCHIVED" ? (
                <section className="rounded-card glass space-y-4 border border-red-500/20 p-4">
                  <div>
                    <h2 className="font-display text-sm font-bold text-red-300">
                      Reset de temporada
                    </h2>
                    <p className="mt-1 text-xs text-muted">
                      Arquiva o ranking atual (snapshot único — não sobrescreve se já arquivado),
                      entrega prêmios do top 3, zera ELO/pontos de todos os jogadores e
                      opcionalmente inicia a próxima season. Não use «Criar e ativar» para trocar
                      de season — sempre use este fluxo.
                    </p>
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={resetNextSeason}
                      onChange={(e) => setResetNextSeason(e.target.checked)}
                    />
                    Criar e ativar próxima temporada após reset
                  </label>

                  {resetNextSeason ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="block sm:col-span-2">
                        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
                          Nome da próxima
                        </span>
                        <input
                          value={resetForm.name}
                          onChange={(e) =>
                            setResetForm((f) => ({ ...f, name: e.target.value }))
                          }
                          className={textInputClass}
                        />
                      </label>
                      <DateField
                        label="Início da próxima"
                        value={resetForm.startsAt}
                        onChange={(startsAt) => setResetForm((f) => ({ ...f, startsAt }))}
                      />
                      <DateField
                        label="Reset (ex: 25/08/2026)"
                        value={resetForm.resetAt}
                        onChange={(resetAt) => setResetForm((f) => ({ ...f, resetAt }))}
                      />
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={actionId === selected.id}
                      onClick={() => grantPrizes(selected.id)}
                    >
                      {actionId === selected.id ? (
                        <Loader2 className="h-4 w-4 motion-safe-spin" />
                      ) : (
                        <Medal className="h-4 w-4" />
                      )}
                      Só entregar prêmios
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-red-500/40 text-red-300 hover:bg-red-500/10"
                      disabled={actionId === selected.id}
                      onClick={() => resetSeason(selected.id)}
                    >
                      {actionId === selected.id ? (
                        <Loader2 className="h-4 w-4 motion-safe-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                      Reset completo
                    </Button>
                  </div>
                </section>
              ) : null}

              <section className="rounded-card glass p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="font-display text-sm font-bold">Ranking arquivado (top 20)</h2>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => selected.id && loadStandings(selected.id)}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                {standingsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 motion-safe-spin text-muted" />
                  </div>
                ) : standings.length === 0 ? (
                  <p className="text-sm text-muted">
                    Nenhum snapshot ainda. O ranking é arquivado no reset ou ao entregar prêmios.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[480px] text-left text-sm">
                      <thead>
                        <tr className="text-xs uppercase text-muted">
                          <th className="pb-2 pr-3">#</th>
                          <th className="pb-2 pr-3">Jogador</th>
                          <th className="pb-2 pr-3">Pts</th>
                          <th className="pb-2 pr-3">ELO</th>
                          <th className="pb-2">W/L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.map((row) => (
                          <tr key={row.position} className="border-t border-border/30">
                            <td className="py-2 pr-3 tabular-nums">{row.position}</td>
                            <td className="py-2 pr-3">
                              <SocialUserName
                                user={{ nickname: row.nickname, displayName: row.displayName }}
                                nameClassName="text-sm"
                              />
                            </td>
                            <td className="py-2 pr-3 tabular-nums">{row.competitivePoints}</td>
                            <td className="py-2 pr-3 tabular-nums">{row.elo}</td>
                            <td className="py-2 tabular-nums">
                              {row.rankedWins}/{row.rankedLosses}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          ) : (
            <section className="rounded-card glass p-8 text-center text-sm text-muted">
              Selecione uma temporada na lista.
            </section>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
}
