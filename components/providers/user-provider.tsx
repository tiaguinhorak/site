"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import type { UserProfile } from "@/lib/serializers";
import { getAvatarInitials } from "@/lib/profile";

type UserContextValue = {
  user: UserProfile | null;
  loading: boolean;
  authenticated: boolean;
  steamLinked: boolean;
  refresh: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
  patchUser: (updates: Partial<UserProfile>) => void;
};

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [user, setUserState] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { credentials: "same-origin" });
      const data = await res.json();
      if (data.authenticated && data.user) {
        setUserState(data.user as UserProfile);
      } else {
        setUserState(null);
      }
    } catch {
      setUserState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [pathname, refresh]);

  const setUser = useCallback((next: UserProfile | null) => {
    setUserState(next);
  }, []);

  const patchUser = useCallback((updates: Partial<UserProfile>) => {
    setUserState((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...updates };
      if (
        updates.firstName !== undefined ||
        updates.lastName !== undefined ||
        updates.nickname !== undefined
      ) {
        next.avatarInitials = getAvatarInitials(
          next.firstName,
          next.lastName,
          next.nickname,
        );
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      authenticated: Boolean(user),
      steamLinked: Boolean(user?.steamLinked),
      refresh,
      setUser,
      patchUser,
    }),
    [user, loading, refresh, setUser, patchUser],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUserContext() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUserContext must be used within UserProvider");
  }
  return ctx;
}
