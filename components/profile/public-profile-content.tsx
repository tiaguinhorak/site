"use client";

import { useEffect, useState } from "react";
import { PublicProfilePage } from "@/components/profile/public-profile-page";
import { RankedMatchHistory } from "@/components/profile/ranked-match-history";
import { PublicProfileSkins } from "@/components/profile/public-profile-skins";
import { PublicProfileMedals } from "@/components/profile/public-profile-medals";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import type { PublicMedal } from "@/lib/achievements/service";
import type { PublicSkinGroup } from "@/lib/inventory/get-public-player-skins";
import type { PublicProfileLabels } from "@/lib/profile/public-profile-labels.shared";
import type { PublicPlayerProfile } from "@/lib/profile/serialize-public";
import { SkeletonCard } from "@/components/ui/skeleton";

type BootstrapPayload = {
  player: PublicPlayerProfile;
  labels: PublicProfileLabels;
  medals: PublicMedal[];
  skins: { groups: PublicSkinGroup[]; total: number };
  level: number;
};

export function PublicProfileContent({ nickname }: { nickname: string }) {
  const [data, setData] = useState<BootstrapPayload | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/players/${encodeURIComponent(nickname)}/bootstrap`, {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("failed");
        return (await res.json()) as BootstrapPayload;
      })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [nickname]);

  if (error) {
    return (
      <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
        Não foi possível carregar o perfil.
      </p>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <SkeletonCard className="h-56" />
        <SkeletonCard className="h-40" />
        <SkeletonCard className="h-64" />
      </div>
    );
  }

  return (
    <>
      <PublicProfilePage initialPlayer={data.player} labels={data.labels} />
      {(!data.player.customization || data.player.customization.profileShowAchievements) && (
        <PublicProfileMedals medals={data.medals} level={data.level} />
      )}
      <PerformanceChart nickname={data.player.nickname} />
      <RankedMatchHistory nickname={data.player.nickname} />
      <PublicProfileSkins groups={data.skins.groups} total={data.skins.total} />
    </>
  );
}
