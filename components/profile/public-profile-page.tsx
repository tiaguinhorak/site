"use client";

import { useMemo } from "react";
import { PublicProfileView } from "@/components/profile/public-profile-view";
import {
  type PublicPlayerProfile,
} from "@/lib/profile/serialize-public";
import { useUser } from "@/lib/hooks/use-user";

export function PublicProfilePage({
  initialPlayer,
}: {
  initialPlayer: PublicPlayerProfile;
}) {
  const { user } = useUser();

  const player = useMemo(() => {
    if (user && user.nickname === initialPlayer.nickname) {
      return {
        ...initialPlayer,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        plan: user.plan,
        rank: user.rank,
        elo: user.elo,
        kd: user.kd,
        matches: user.matches,
        winRate: user.winRate,
        level: user.level,
        xp: user.xp,
        competitivePoints: user.competitivePoints,
        rankedWins: user.rankedWins,
        rankedLosses: user.rankedLosses,
        rankedKills: user.rankedKills,
        rankedDeaths: user.rankedDeaths,
        rankedAssists: user.rankedAssists,
      };
    }
    return initialPlayer;
  }, [user, initialPlayer]);

  return <PublicProfileView player={player} />;
}
