import "server-only";

import { afterCsgoMatchMutation } from "@/lib/csgo-api/invalidate-caches";
import { abandonRankedSessionInternal } from "@/lib/ranked/reconcile-stale-sessions";
import { voidFinishedRankedSession } from "@/lib/ranked/match-result-reversal";
import { notifyRankedRooms, notifySessionParticipants } from "@/lib/realtime/notify";

export async function adminAbandonRankedSession(
  sessionId: string,
  mode: "cancel" | "finish",
): Promise<{ ok: boolean; message: string }> {
  const ok = await abandonRankedSessionInternal(sessionId, mode);
  if (!ok) {
    return {
      ok: false,
      message: "Sessão não encontrada ou já encerrada.",
    };
  }

  afterCsgoMatchMutation();
  void notifySessionParticipants(sessionId, "session");
  void notifyRankedRooms("session");

  return {
    ok: true,
    message:
      mode === "finish"
        ? "Partida ranked encerrada e times liberados."
        : "Partida ranked cancelada e times liberados.",
  };
}

export async function adminVoidFinishedRankedSession(
  sessionId: string,
): Promise<{ ok: boolean; message: string }> {
  return voidFinishedRankedSession(sessionId);
}
