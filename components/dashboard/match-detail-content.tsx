"use client";

import { useEffect, useState } from "react";
import { MatchDetailView } from "@/components/dashboard/match-detail-view";
import type { MatchDetail } from "@/lib/ranked/match-detail";
import { SkeletonCard } from "@/components/ui/skeleton";

export function MatchDetailContent({ matchId }: { matchId: string }) {
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/ranked/matches/${encodeURIComponent(matchId)}/detail`, {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("failed");
        const json = (await res.json()) as { match: MatchDetail };
        return json.match;
      })
      .then((payload) => {
        if (!cancelled) setMatch(payload);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  if (error) {
    return (
      <p className="alert-warning px-4 py-3 text-sm">
        Não foi possível carregar a partida.
      </p>
    );
  }

  if (!match) {
    return <SkeletonCard className="h-[520px]" />;
  }

  return <MatchDetailView match={match} />;
}
