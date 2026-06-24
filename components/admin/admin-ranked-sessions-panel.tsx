"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Flag, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { secureApi } from "@/lib/api/client";
import { confirmPresets } from "@/lib/confirm-presets";
import { formatMapLabel } from "@/lib/servers/maps";

type RankedSessionRow = {
  id: string;
  status: string;
  matchSource: string;
  selectedMap: string | null;
  csgoMatchId: string | null;
  serverHost: string | null;
  serverPort: number | null;
  playerCount: number;
  createdAt: string;
};

type Props = {
  sessions: RankedSessionRow[];
  busyId: string | null;
  onBusyChange: (id: string | null) => void;
  onRefresh: () => void;
  onMessage: (message: string) => void;
  onError: (message: string) => void;
};

export function AdminRankedSessionsPanel({
  sessions,
  busyId,
  onBusyChange,
  onRefresh,
  onMessage,
  onError,
}: Props) {
  const router = useRouter();

  async function cancelSession(session: RankedSessionRow) {
    onBusyChange(`ranked:cancel:${session.id}`);
    const result = await secureApi<{ ok: boolean; message: string }>(
      `/api/admin/ranked/sessions/${session.id}/cancel`,
      { method: "POST" },
    );
    onBusyChange(null);
    if (!result.ok) {
      onError(result.error);
      return;
    }
    onMessage(result.data.message);
    onRefresh();
    router.refresh();
  }

  async function finishSession(session: RankedSessionRow) {
    onBusyChange(`ranked:finish:${session.id}`);
    const result = await secureApi<{ ok: boolean; message: string }>(
      `/api/admin/ranked/sessions/${session.id}/finish`,
      { method: "POST" },
    );
    onBusyChange(null);
    if (!result.ok) {
      onError(result.error);
      return;
    }
    onMessage(result.data.message);
    onRefresh();
    router.refresh();
  }

  return (
    <div className="rounded-card glass-strong p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">Sessões ranked (site)</h2>
          <p className="mt-1 text-sm text-muted">
            Partidas criadas pelo fluxo ranked/lobby no site. Use aqui para cancelar testes que não
            aparecem na API CS:GO.
          </p>
        </div>
        <Link
          href="/dashboard/ranked"
          className="text-sm font-medium text-primary underline-offset-2 hover:underline"
        >
          Abrir ranked
        </Link>
      </div>

      <ul className="space-y-3">
        {sessions.length === 0 ? (
          <li className="text-sm text-muted">Nenhuma sessão ranked ativa no site.</li>
        ) : (
          sessions.map((session) => (
            <li
              key={session.id}
              className="rounded-xl border border-border px-4 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-muted">{session.id}</p>
                  <p className="text-sm font-semibold text-foreground">
                    {session.status}
                    {session.selectedMap ? ` · ${formatMapLabel(session.selectedMap)}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {session.matchSource} · {session.playerCount} jogadores ·{" "}
                    {new Date(session.createdAt).toLocaleString("pt-BR")}
                  </p>
                  {session.csgoMatchId && (
                    <p className="mt-1 font-mono text-[10px] text-muted">
                      API: {session.csgoMatchId}
                    </p>
                  )}
                  {session.serverHost && session.serverPort && (
                    <p className="mt-1 font-mono text-[10px] text-muted">
                      {session.serverHost}:{session.serverPort}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {["accepting", "voting", "starting"].includes(session.status) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busyId != null}
                      confirm={confirmPresets.rankedCancelMatch}
                      onClick={() => void cancelSession(session)}
                    >
                      {busyId === `ranked:cancel:${session.id}` ? (
                        <Loader2 className="h-4 w-4 motion-safe-spin" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      Cancelar
                    </Button>
                  )}
                  {["live", "starting"].includes(session.status) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busyId != null}
                      confirm={{
                        title: "Encerrar partida ranked?",
                        description:
                          "Marca a sessão como finalizada, libera os lobbies e encerra a partida na API CS:GO se existir.",
                        confirmLabel: "Encerrar",
                        cancelLabel: "Voltar",
                        tone: "warning" as const,
                      }}
                      onClick={() => void finishSession(session)}
                    >
                      {busyId === `ranked:finish:${session.id}` ? (
                        <Loader2 className="h-4 w-4 motion-safe-spin" />
                      ) : (
                        <Flag className="h-4 w-4" />
                      )}
                      Encerrar
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
