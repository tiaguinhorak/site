"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldAlert, UserSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { secureApi } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type ReviewCase = {
  id: string;
  nickname: string;
  steamId: string;
  matchId: string | null;
  demoUrl: string | null;
  reason: string;
  severity: number;
  status: string;
  adminNotes: string;
  createdAt: string;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  UNDER_REVIEW: "Em análise",
  CLEARED: "Inocente",
  CONFIRMED: "Confirmado",
  DISMISSED: "Arquivado",
};

const STATUS_CLASS: Record<string, string> = {
  PENDING: "text-amber-300 bg-amber-500/15",
  UNDER_REVIEW: "text-sky-300 bg-sky-500/15",
  CLEARED: "text-emerald-300 bg-emerald-500/15",
  CONFIRMED: "text-rose-300 bg-rose-500/15",
  DISMISSED: "text-muted bg-black/20",
};

export function AdminVarAcSection() {
  const [cases, setCases] = useState<ReviewCase[]>([]);
  const [filter, setFilter] = useState<string>("PENDING");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const query = filter ? `?status=${encodeURIComponent(filter)}` : "";
    const result = await secureApi<{ cases: ReviewCase[] }>(`/api/admin/var-ac/cases${query}`);
    setCases(result.ok ? result.data.cases : []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateCase(id: string, patch: { status?: string; adminNotes?: string }) {
    setBusyId(id);
    const result = await secureApi(`/api/admin/var-ac/cases/${id}`, {
      method: "PATCH",
      json: patch,
    });
    setBusyId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Caso atualizado.");
    void load();
  }

  return (
    <div className="rounded-card glass-strong p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <ShieldAlert className="h-5 w-5 text-primary" />
            VAR — Anti-cheat
          </h2>
          <p className="mt-1 text-sm text-muted">
            Revise suspeitas reportadas pelo anticheat ou equipe. Marque como inocente, confirmado
            ou arquive após análise.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {["PENDING", "UNDER_REVIEW", "CONFIRMED", "CLEARED", "DISMISSED", ""].map((status) => (
            <button
              key={status || "all"}
              type="button"
              onClick={() => setFilter(status)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-semibold",
                filter === status
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted hover:text-foreground",
              )}
            >
              {status ? STATUS_LABEL[status] : "Todos"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 motion-safe-spin text-muted" />
        </div>
      ) : cases.length === 0 ? (
        <p className="text-sm text-muted">Nenhum caso neste filtro.</p>
      ) : (
        <ul className="space-y-3">
          {cases.map((item) => (
            <li key={item.id} className="rounded-xl border border-border px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-sm font-bold text-foreground">{item.nickname}</p>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                        STATUS_CLASS[item.status] ?? STATUS_CLASS.PENDING,
                      )}
                    >
                      {STATUS_LABEL[item.status] ?? item.status}
                    </span>
                    <span className="text-xs text-muted">Severidade {item.severity}/5</span>
                  </div>
                  <p className="mt-1 text-sm text-foreground">{item.reason}</p>
                  <p className="mt-1 font-mono text-[10px] text-muted">
                    Steam {item.steamId || "—"}
                    {item.matchId ? ` · Partida ${item.matchId}` : ""}
                  </p>
                  <p className="mt-1 text-[10px] text-muted">
                    {new Date(item.createdAt).toLocaleString("pt-BR")}
                  </p>
                  {item.demoUrl && (
                    <a
                      href={item.demoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-xs text-primary hover:underline"
                    >
                      Abrir demo
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.status === "PENDING" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busyId != null}
                      onClick={() => void updateCase(item.id, { status: "UNDER_REVIEW" })}
                    >
                      Analisar
                    </Button>
                  )}
                  {["PENDING", "UNDER_REVIEW"].includes(item.status) && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busyId != null}
                        onClick={() => void updateCase(item.id, { status: "CLEARED" })}
                      >
                        Inocente
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busyId != null}
                        onClick={() => void updateCase(item.id, { status: "CONFIRMED" })}
                      >
                        Confirmar cheat
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busyId != null}
                        onClick={() => void updateCase(item.id, { status: "DISMISSED" })}
                      >
                        Arquivar
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <label className="mt-3 block">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Notas VAR
                </span>
                <textarea
                  defaultValue={item.adminNotes}
                  rows={2}
                  className="w-full rounded-lg border border-border bg-black/20 px-3 py-2 text-sm"
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    if (value !== item.adminNotes) {
                      void updateCase(item.id, { adminNotes: value });
                    }
                  }}
                />
              </label>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 rounded-xl border border-dashed border-border p-4 text-sm text-muted">
        <p className="flex items-center gap-2 font-semibold text-foreground">
          <UserSearch className="h-4 w-4" />
          Integração anticheat
        </p>
        <p className="mt-1">
          Casos podem ser criados via API interna quando o plugin AC reportar suspeitas. Use este
          painel para revisão manual (VAR) antes de punir jogadores.
        </p>
      </div>
    </div>
  );
}
