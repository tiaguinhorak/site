"use client";

import { useEffect, useState } from "react";
import { SeasonInfoCards } from "@/components/marketing/season-info-cards";
import { SeasonInfoFallback } from "@/components/marketing/season-info-fallback";
import { RankingBoard } from "@/components/ranking/ranking-board";
import { RankingScoringHintClient } from "@/components/ranking/ranking-scoring-hint-client";
import { SkeletonCard } from "@/components/ui/skeleton";
import { fetchRankingBootstrapDeduped } from "@/lib/ranking/client-bootstrap-cache";
import type { RankingBootstrapPayload } from "@/lib/ranking/ranking-bootstrap";

type RankingPageContentProps = {
  variant?: "dashboard" | "marketing";
  className?: string;
};

export function RankingPageContent({
  variant = "dashboard",
  className,
}: RankingPageContentProps) {
  const [bootstrap, setBootstrap] = useState<RankingBootstrapPayload | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void fetchRankingBootstrapDeduped().then((payload) => {
      if (cancelled) return;
      if (!payload) {
        setLoadError(true);
        return;
      }
      setBootstrap(payload);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loadError) {
    return (
      <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
        Não foi possível carregar o ranking. Tente recarregar a página.
      </p>
    );
  }

  if (!bootstrap) {
    return (
      <div className={className}>
        <SeasonInfoFallback />
        <div className="mt-6 flex justify-end">
          <SkeletonCard className="h-9 w-9 rounded-xl" />
        </div>
        <div className="mt-4 space-y-4">
          <SkeletonCard className="h-24" />
          <SkeletonCard className="h-12" />
          <SkeletonCard className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <SeasonInfoCards season={bootstrap.seasonSummary} />
      <div className={variant === "marketing" ? "mt-10 flex justify-end" : "mb-4 mt-6 flex justify-end"}>
        <RankingScoringHintClient labels={bootstrap.scoringLabels} />
      </div>
      <RankingBoard
        initialData={bootstrap.initialData}
        labels={bootstrap.labels}
        seasons={bootstrap.seasons}
        defaultSeasonId={bootstrap.defaultSeasonId}
        prizesBySeasonId={bootstrap.prizesBySeasonId}
        variant={variant}
      />
    </div>
  );
}
