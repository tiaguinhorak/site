"use client";

import { useMemo } from "react";
import { PublicProfileView } from "@/components/profile/public-profile-view";
import { useOptionalUserContext } from "@/components/providers/user-provider";
import { type PublicPlayerProfile } from "@/lib/profile/serialize-public";
import type { PublicProfileLabels } from "@/lib/profile/public-profile-labels.shared";

export function PublicProfilePage({
  initialPlayer,
  labels,
}: {
  initialPlayer: PublicPlayerProfile;
  labels: PublicProfileLabels;
}) {
  const sessionUser = useOptionalUserContext()?.user ?? null;

  const player = useMemo(() => {
    if (!sessionUser || sessionUser.nickname !== initialPlayer.nickname) {
      return initialPlayer;
    }

    return {
      ...initialPlayer,
      avatarUrl: sessionUser.avatarUrl,
      bio: sessionUser.bio,
      plan: sessionUser.plan,
      customization: sessionUser.customization ?? initialPlayer.customization,
      rank: sessionUser.rank,
      elo: sessionUser.elo,
      kd: sessionUser.kd,
      matches: sessionUser.matches,
      winRate: sessionUser.winRate,
      level: sessionUser.level,
      xp: sessionUser.xp,
      competitivePoints: sessionUser.competitivePoints,
      rankedWins: sessionUser.rankedWins,
      rankedLosses: sessionUser.rankedLosses,
      rankedKills: sessionUser.rankedKills,
      rankedDeaths: sessionUser.rankedDeaths,
      rankedAssists: sessionUser.rankedAssists,
    };
  }, [sessionUser, initialPlayer]);

  return <PublicProfileView player={player} labels={labels} />;
}
