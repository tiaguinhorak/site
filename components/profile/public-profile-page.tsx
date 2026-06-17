"use client";

import { useMemo } from "react";
import { PublicProfileView } from "@/components/profile/public-profile-view";
import {
  type PublicPlayerProfile,
  userProfileToPublic,
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
      return userProfileToPublic(user);
    }
    return initialPlayer;
  }, [user, initialPlayer]);

  return <PublicProfileView player={player} />;
}
