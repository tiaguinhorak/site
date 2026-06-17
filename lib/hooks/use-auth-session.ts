"use client";

import type { AuthSessionUser } from "@/lib/hooks/use-auth-session-types";
import { useUserContext } from "@/components/providers/user-provider";

export type { AuthSessionUser };

export function useAuthSession() {
  const { user, loading, authenticated, steamLinked } = useUserContext();

  const sessionUser: AuthSessionUser | null = user
    ? {
        nickname: user.nickname,
        steamLinked: user.steamLinked,
        avatarUrl: user.avatarUrl,
        steamAvatarUrl: user.steamAvatarUrl,
        plan: user.plan,
      }
    : null;

  return {
    authenticated,
    loading,
    user: sessionUser,
    steamLinked,
  };
}
