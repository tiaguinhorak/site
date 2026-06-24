"use client";

import { useCallback, useEffect, useState } from "react";
import { Ban, Clock, Loader2, ShieldAlert, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { secureApi } from "@/lib/api/client";
import {
  formatRestrictionDuration,
  RANKED_QUEUE_BAN_MINUTES,
  type RankedQueueRestrictionView,
} from "@/lib/ranked/queue-restriction-shared";
import { cn } from "@/lib/utils";

type Props = {
  userId: string;
  nickname: string;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
};

export function AdminRankedQueuePanel({ userId, nickname, onSuccess, onError }: Props) {
  const [restriction, setRestriction] = useState<RankedQueueRestrictionView | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restrictForm, setRestrictForm] = useState({
    minutes: String(RANKED_QUEUE_BAN_MINUTES[0]),
    reason: "",
    incrementDodge: true,
  });

  const loadRestriction = useCallback(async () => {
    const res = await fetch(`/api/admin/users/${userId}/ranked-queue`, {
      credentials: "same-origin",
    });
    if (!res.ok) {
      onError?.("Não foi possível carregar dados da fila rankeada.");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setRestriction(data.restriction);
    setLoading(false);
  }, [onError, userId]);

  useEffect(() => {
    void loadRestriction();
  }, [loadRestriction]);

  useEffect(() => {
    if (!restriction?.restricted) return;
    const interval = window.setInterval(() => {
      void loadRestriction();
    }, 1000);
    return () => window.clearInterval(interval);
  }, [restriction?.restricted, loadRestriction]);

  async function applyRestrict() {
    if (!restrictForm.reason.trim()) {
      onError?.("Informe o motivo da restrição.");
      return;
    }
    setSaving(true);
    const result = await secureApi<{ restriction: RankedQueueRestrictionView }>(
      `/api/admin/users/${userId}/ranked-queue/restrict`,
      {
        method: "POST",
        json: {
          minutes: Number(restrictForm.minutes),
          reason: restrictForm.reason,
          incrementDodge: restrictForm.incrementDodge,
        },
      },
    );
    setSaving(false);
    if (!result.ok) {
      onError?.(result.error);
      return;
    }
    setRestriction(result.data.restriction);
    setRestrictForm((f) => ({ ...f, reason: "" }));
    onSuccess?.(`Restrição de fila aplicada a ${nickname}.`);
  }

  async function clearRestriction(resetDodges: boolean) {
    setSaving(true);
    const result = await secureApi<{ restriction: RankedQueueRestrictionView }>(
      `/api/admin/users/${userId}/ranked-queue/clear`,
      {
        method: "POST",
        json: { resetDodges },
      },
    );
    setSaving(false);
    if (!result.ok) {
      onError?.(result.error);
      return;
    }
    setRestriction(result.data.restriction);
    onSuccess?.(
      resetDodges
        ? `Restrição e strikes de fila removidos de ${nickname}.`
        : `Restrição ativa de fila removida de ${nickname}.`,
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-6 text-muted">
        <Loader2 className="h-5 w-5 motion-safe-spin" />
      </div>
    );
  }

  if (!restriction) {
    return (
      <p className="text-sm text-muted">Dados da fila rankeada indisponíveis.</p>
    );
  }

  return (
    <div className="rounded-xl border border-border p-4 space-y-4">
      <h3 className="flex items-center gap-2 font-display font-bold">
        <ShieldAlert className="h-4 w-4 text-primary" />
        Fila rankeada 5x5
      </h3>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs uppercase text-muted">Strikes</p>
          <p className="mt-1 font-display text-xl font-bold">{restriction.dodges}</p>
          <p className="mt-1 text-[10px] text-muted">
            1º cancelamento = aviso · 2º+ = restrição
          </p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs uppercase text-muted">Status</p>
          <p
            className={cn(
              "mt-1 text-sm font-semibold",
              restriction.restricted ? "text-rose-400" : "text-emerald-400",
            )}
          >
            {restriction.restricted ? "Restrito" : "Liberado"}
          </p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs uppercase text-muted">Próxima punição</p>
          <p className="mt-1 font-display text-xl font-bold">
            {restriction.nextBanMinutes !== null
              ? `${restriction.nextBanMinutes} min`
              : "Aviso"}
          </p>
        </div>
      </div>

      {restriction.restricted && (
        <div className="flex items-center gap-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-3">
          <Clock className="h-5 w-5 shrink-0 text-rose-400" />
          <div>
            <p className="text-sm font-semibold text-rose-200">Restrição ativa</p>
            <p className="font-mono text-lg font-bold text-foreground">
              {formatRestrictionDuration(restriction.remainingMs)}
            </p>
            {restriction.restrictedUntil && (
              <p className="text-xs text-muted">
                Até {new Date(restriction.restrictedUntil).toLocaleString("pt-BR")}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3 border-t border-border pt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          Aplicar restrição manual
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
              Minutos
            </label>
            <select
              value={restrictForm.minutes}
              onChange={(e) =>
                setRestrictForm({ ...restrictForm, minutes: e.target.value })
              }
              className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
            >
              {RANKED_QUEUE_BAN_MINUTES.map((m) => (
                <option key={m} value={String(m)}>
                  {m} min
                </option>
              ))}
              <option value="1440">24 h (1440 min)</option>
            </select>
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              checked={restrictForm.incrementDodge}
              onChange={(e) =>
                setRestrictForm({ ...restrictForm, incrementDodge: e.target.checked })
              }
            />
            Incrementar strike
          </label>
        </div>
        <Input
          label="Motivo"
          value={restrictForm.reason}
          onChange={(e) => setRestrictForm({ ...restrictForm, reason: e.target.value })}
        />
        <Button type="button" variant="outline" disabled={saving} onClick={applyRestrict}>
          {saving ? (
            <Loader2 className="h-4 w-4 motion-safe-spin" />
          ) : (
            <>
              <Ban className="h-4 w-4" />
              Restringir fila
            </>
          )}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={saving || !restriction.restricted}
          onClick={() => clearRestriction(false)}
        >
          <Unlock className="h-4 w-4" />
          Remover restrição ativa
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-rose-400"
          disabled={saving}
          onClick={() => clearRestriction(true)}
        >
          Zerar strikes e restrição
        </Button>
      </div>
    </div>
  );
}
