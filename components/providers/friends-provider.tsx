"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/hooks/use-user";
import { secureApi } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import { useRealtimeEvents } from "@/components/providers/realtime-provider";
import type { PublicProfileCustomization } from "@/lib/profile/serialize-customization";
import type { RankedInvitePayload } from "@/lib/realtime/types";

export type FriendUserLite = {
  id: string;
  nickname: string;
  displayName: string;
  country: string;
  avatarUrl: string | null;
  plan: string;
  level: number;
  elo: number;
  customization: PublicProfileCustomization | null;
};

export type FriendEntryLite = FriendUserLite & { friendshipId: string };

export type ChatMessage = {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
  mine: boolean;
};

type FriendsContextValue = {
  friends: FriendEntryLite[];
  onlineIds: Set<string>;
  incomingCount: number;
  unread: Record<string, number>;
  totalUnread: number;
  threads: Record<string, ChatMessage[]>;
  openChats: string[];
  loadingThread: Record<string, boolean>;
  refresh: () => void;
  isOnline: (userId: string) => boolean;
  openChat: (friendId: string) => void;
  closeChat: (friendId: string) => void;
  sendMessage: (friendId: string, body: string) => Promise<boolean>;
  inviteToRanked: (friendId: string) => Promise<boolean>;
  incomingInvite: RankedInvitePayload | null;
  acceptInvite: () => void;
  dismissInvite: () => void;
};

const FriendsContext = createContext<FriendsContextValue | null>(null);

export function FriendsProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const userId = user?.id ?? null;
  const router = useRouter();

  const [friends, setFriends] = useState<FriendEntryLite[]>([]);
  const [incomingCount, setIncomingCount] = useState(0);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [threads, setThreads] = useState<Record<string, ChatMessage[]>>({});
  const [openChats, setOpenChats] = useState<string[]>([]);
  const [loadingThread, setLoadingThread] = useState<Record<string, boolean>>({});
  const [incomingInvite, setIncomingInvite] = useState<RankedInvitePayload | null>(null);

  const openChatsRef = useRef<string[]>([]);
  openChatsRef.current = openChats;

  const refresh = useCallback(() => {
    if (!userId) return;
    fetch("/api/friends", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => {
        setFriends(d.friends ?? []);
        setIncomingCount((d.incoming ?? []).length);
      })
      .catch(() => undefined);
    fetch("/api/friends/presence", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => setOnlineIds(new Set<string>(d.online ?? [])))
      .catch(() => undefined);
    fetch("/api/friends/messages", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => setUnread(d.unread ?? {}))
      .catch(() => undefined);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    const interval = window.setInterval(refresh, 60_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
    };
  }, [userId, refresh]);

  const appendMessage = useCallback(
    (otherId: string, message: ChatMessage) => {
      setThreads((prev) => {
        const existing = prev[otherId] ?? [];
        if (existing.some((m) => m.id === message.id)) return prev;
        return { ...prev, [otherId]: [...existing, message] };
      });
    },
    [],
  );

  useRealtimeEvents(
    useCallback(
      (event) => {
        if (event.type === "presence") {
          setOnlineIds((prev) => {
            const next = new Set(prev);
            if (event.online) next.add(event.userId);
            else next.delete(event.userId);
            return next;
          });
          return;
        }
        if (event.type === "dm") {
          const msg = event.message;
          const mine = msg.senderId === userId;
          const otherId = mine ? msg.recipientId : msg.senderId;
          appendMessage(otherId, { ...msg, mine });
          if (!mine && !openChatsRef.current.includes(otherId)) {
            setUnread((prev) => ({ ...prev, [otherId]: (prev[otherId] ?? 0) + 1 }));
          }
          return;
        }
        if (event.type === "ranked_invite") {
          setIncomingInvite(event.invite);
          return;
        }
      },
      [userId, appendMessage],
    ),
    Boolean(userId),
  );

  const isOnline = useCallback((id: string) => onlineIds.has(id), [onlineIds]);

  const openChat = useCallback(
    (friendId: string) => {
      setOpenChats((prev) => (prev.includes(friendId) ? prev : [...prev, friendId]));
      setUnread((prev) => {
        if (!prev[friendId]) return prev;
        const next = { ...prev };
        delete next[friendId];
        return next;
      });
      setLoadingThread((prev) => ({ ...prev, [friendId]: true }));
      fetch(`/api/friends/messages?withUserId=${encodeURIComponent(friendId)}`, {
        credentials: "same-origin",
      })
        .then((r) => r.json())
        .then((d) => {
          setThreads((prev) => ({ ...prev, [friendId]: d.messages ?? [] }));
        })
        .catch(() => undefined)
        .finally(() => setLoadingThread((prev) => ({ ...prev, [friendId]: false })));
    },
    [],
  );

  const closeChat = useCallback((friendId: string) => {
    setOpenChats((prev) => prev.filter((id) => id !== friendId));
  }, []);

  const sendMessage = useCallback(
    async (friendId: string, body: string) => {
      const trimmed = body.trim();
      if (!trimmed) return false;
      const result = await secureApi<{ ok: boolean; message: ChatMessage }>(
        "/api/friends/messages",
        { method: "POST", json: { toUserId: friendId, body: trimmed } },
      );
      if (!result.ok) {
        toast.error(result.error);
        return false;
      }
      appendMessage(friendId, result.data.message);
      return true;
    },
    [appendMessage],
  );

  const inviteToRanked = useCallback(async (friendId: string) => {
    const result = await secureApi<{ ok: boolean; delivered: boolean }>(
      "/api/ranked/party/invite",
      { method: "POST", json: { toUserId: friendId } },
    );
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    return true;
  }, []);

  const acceptInvite = useCallback(() => {
    const invite = incomingInvite;
    if (!invite) return;
    setIncomingInvite(null);
    router.push(`/dashboard/ranked?join=${encodeURIComponent(invite.inviteCode)}`);
  }, [incomingInvite, router]);

  const dismissInvite = useCallback(() => setIncomingInvite(null), []);

  const totalUnread = useMemo(
    () => Object.values(unread).reduce((sum, n) => sum + n, 0),
    [unread],
  );

  const value = useMemo<FriendsContextValue>(
    () => ({
      friends,
      onlineIds,
      incomingCount,
      unread,
      totalUnread,
      threads,
      openChats,
      loadingThread,
      refresh,
      isOnline,
      openChat,
      closeChat,
      sendMessage,
      inviteToRanked,
      incomingInvite,
      acceptInvite,
      dismissInvite,
    }),
    [
      friends,
      onlineIds,
      incomingCount,
      unread,
      totalUnread,
      threads,
      openChats,
      loadingThread,
      refresh,
      isOnline,
      openChat,
      closeChat,
      sendMessage,
      inviteToRanked,
      incomingInvite,
      acceptInvite,
      dismissInvite,
    ],
  );

  return <FriendsContext.Provider value={value}>{children}</FriendsContext.Provider>;
}

export function useFriends() {
  const ctx = useContext(FriendsContext);
  if (!ctx) throw new Error("useFriends must be used within FriendsProvider");
  return ctx;
}

export function useFriendsOptional() {
  return useContext(FriendsContext);
}
