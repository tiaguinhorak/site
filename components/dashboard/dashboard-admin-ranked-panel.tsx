"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@/lib/hooks/use-user";
import { AdminRankedSessionsPanel } from "@/components/admin/admin-ranked-sessions-panel";

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
  resultSyncedAt?: string | null;
  scoreTeamA?: number | null;
  scoreTeamB?: number | null;
};

export function DashboardAdminRankedPanel() {
  const { user } = useUser();
  const [sessions, setSessions] = useState<RankedSessionRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/ranked/sessions", { credentials: "same-origin" });
    if (!res.ok) {
      setSessions([]);
      return;
    }
    const data = await res.json();
    setSessions(data.sessions ?? []);
  }, []);

  useEffect(() => {
    if (!user?.isAdmin) return;
    void load();
  }, [user?.isAdmin, load]);

  if (!user?.isAdmin || sessions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {message}
        </p>
      )}
      <AdminRankedSessionsPanel
        sessions={sessions}
        busyId={busyId}
        onBusyChange={setBusyId}
        onRefresh={() => void load()}
        onMessage={setMessage}
        onError={setError}
      />
    </div>
  );
}
