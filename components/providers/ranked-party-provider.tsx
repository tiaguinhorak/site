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
import { usePathname } from "next/navigation";
import { secureApi } from "@/lib/api/client";
import { RankedConnectModal } from "@/components/ranked/ranked-connect-modal";
import { RankedAcceptModal } from "@/components/ranked/ranked-accept-modal";
import { RankedVoteModal } from "@/components/ranked/ranked-vote-modal";
import { RankedPostMatchModal } from "@/components/ranked/ranked-post-match-modal";
import { useUser } from "@/lib/hooks/use-user";
import {
  formatRestrictionDuration,
  type RankedQueueRestrictionView,
} from "@/lib/ranked/queue-restriction-shared";
import type {
  RankedChallengeView,
  RankedEligibility,
  RankedMapVoteStateView,
  RankedMatchSessionView,
  RankedPartyView,
  RankedRoomsResponse,
  RankedTeamConfigInput,
} from "@/lib/ranked/party-shared";
import type { RankedPartyActivityView } from "@/lib/ranked/party-activity";
import type { RankedPartyMessageView } from "@/lib/ranked/party-chat";
import type { RankedQueueStatusView } from "@/lib/ranked/queue-service";
import { RANKED_TEAM_SIZE } from "@/lib/ranked";
import {
  isRankedPlayRoute,
  isActiveRankedSession,
  rankedPollIntervalMs,
  rankedPollTier,
  type RankedRefreshTier,
} from "@/lib/ranked/polling";
import {
  useRealtimeInvalidate,
  useRealtimeMatchLive,
  useRealtimeStatus,
} from "@/components/providers/realtime-provider";
import { invalidateScopeToRefreshTier } from "@/lib/realtime/client-scope";

type RankedPartyContextValue = {
  party: RankedPartyView | null;
  session: RankedMatchSessionView | null;
  vote: RankedMapVoteStateView | null;
  launchMessage: string | null;
  challengeableParties: RankedPartyView[];
  rooms: RankedPartyView[];
  roomStats: RankedRoomsResponse["stats"];
  eligibility: RankedEligibility | null;
  incomingChallenges: RankedChallengeView[];
  outgoingChallenges: RankedChallengeView[];
  partyActivities: RankedPartyActivityView[];
  partyMessages: RankedPartyMessageView[];
  restriction: RankedQueueRestrictionView | null;
  queue: RankedQueueStatusView | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  ensureParty: () => Promise<void>;
  createTeam: (config: RankedTeamConfigInput) => Promise<boolean>;
  updateTeam: (config: RankedTeamConfigInput) => Promise<boolean>;
  disbandTeam: () => Promise<boolean>;
  joinParty: (inviteCode: string) => Promise<boolean>;
  joinRoom: (partyId: string, password?: string) => Promise<boolean>;
  leaveParty: () => Promise<boolean>;
  kickMember: (userId: string) => Promise<boolean>;
  sendPartyMessage: (body: string) => Promise<boolean>;
  sendChallenge: (toPartyId: string) => Promise<boolean>;
  respondChallenge: (challengeId: string, accept: boolean) => Promise<boolean>;
  acceptMatch: () => Promise<boolean>;
  joinQueue: () => Promise<boolean>;
  leaveQueue: () => Promise<boolean>;
  castVote: (map: string) => Promise<boolean>;
  cancelMatch: () => Promise<boolean>;
  finishMatch: () => Promise<boolean>;
  rematch: () => Promise<boolean>;
  swapRematch: () => Promise<boolean>;
  leaveMatchRoom: () => Promise<boolean>;
  forceClearStuckMatch: () => Promise<boolean>;
  postMatch: RankedMatchSessionView | null;
  postMatchModalVisible: boolean;
  dismissPostMatchModal: () => void;
  voteActionLoading: string | null;
  voteModalVisible: boolean;
  acceptModalVisible: boolean;
  connectModalVisible: boolean;
  dismissVoteModal: () => void;
  dismissAcceptModal: () => void;
  dismissConnectModal: () => void;
  reopenVoteModal: () => void;
  reopenAcceptModal: () => void;
  reopenConnectModal: () => void;
  pausePolling: () => void;
  resumePolling: () => void;
};

const RankedPartyContext = createContext<RankedPartyContextValue | null>(null);

export function RankedPartyProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useUser();
  const userId = user?.id;
  const [party, setParty] = useState<RankedPartyView | null>(null);
  const [session, setSession] = useState<RankedMatchSessionView | null>(null);
  const [vote, setVote] = useState<RankedMapVoteStateView | null>(null);
  const [launchMessage, setLaunchMessage] = useState<string | null>(null);
  const [challengeableParties, setChallengeableParties] = useState<RankedPartyView[]>([]);
  const [rooms, setRooms] = useState<RankedPartyView[]>([]);
  const [roomStats, setRoomStats] = useState<RankedRoomsResponse["stats"]>({
    available: 0,
    full: 0,
    inMatch: 0,
    players: 0,
  });
  const [eligibility, setEligibility] = useState<RankedEligibility | null>(null);
  const [incomingChallenges, setIncomingChallenges] = useState<RankedChallengeView[]>([]);
  const [outgoingChallenges, setOutgoingChallenges] = useState<RankedChallengeView[]>([]);
  const [partyActivities, setPartyActivities] = useState<RankedPartyActivityView[]>([]);
  const [partyMessages, setPartyMessages] = useState<RankedPartyMessageView[]>([]);
  const [restriction, setRestriction] = useState<RankedQueueRestrictionView | null>(null);
  const [queue, setQueue] = useState<RankedQueueStatusView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voteActionLoading, setVoteActionLoading] = useState<string | null>(null);
  const [dismissedVoteSessionId, setDismissedVoteSessionId] = useState<string | null>(null);
  const [dismissedAcceptSessionId, setDismissedAcceptSessionId] = useState<string | null>(null);
  const [dismissedConnectSessionId, setDismissedConnectSessionId] = useState<string | null>(null);
  const [postMatch, setPostMatch] = useState<RankedMatchSessionView | null>(null);
  const [dismissedPostMatchSessionId, setDismissedPostMatchSessionId] = useState<string | null>(null);
  const [postMatchActionLoading, setPostMatchActionLoading] = useState<string | null>(null);
  const [finishLoading, setFinishLoading] = useState(false);

  const refreshInFlightRef = useRef(false);
  const pausePollingRef = useRef(0);
  const pollTickRef = useRef(0);
  const partyRef = useRef(party);
  const sessionRef = useRef(session);
  const queueRef = useRef(queue);
  const postMatchRef = useRef(postMatch);

  partyRef.current = party;
  sessionRef.current = session;
  queueRef.current = queue;
  postMatchRef.current = postMatch;

  const pausePolling = useCallback(() => {
    pausePollingRef.current += 1;
  }, []);

  const resumePolling = useCallback(() => {
    pausePollingRef.current = Math.max(0, pausePollingRef.current - 1);
  }, []);

  const refreshRestriction = useCallback(async () => {
    const result = await secureApi<{ restriction: RankedQueueRestrictionView }>(
      "/api/ranked/queue/restriction",
    );
    if (result.ok) setRestriction(result.data.restriction);
  }, []);

  const applyTierResults = useCallback(
    (
      tier: RankedRefreshTier,
      results: {
        partyRes: Awaited<
          ReturnType<
            typeof secureApi<{ party: RankedPartyView | null; session: RankedMatchSessionView | null }>
          >
        > | null;
        partiesRes: Awaited<
          ReturnType<
            typeof secureApi<{
              parties: RankedPartyView[];
              challenges: { incoming: RankedChallengeView[]; outgoing: RankedChallengeView[] };
            }>
          >
        > | null;
        roomsRes: Awaited<ReturnType<typeof secureApi<RankedRoomsResponse>>> | null;
        sessionRes: Awaited<
          ReturnType<
            typeof secureApi<{
              session: RankedMatchSessionView | null;
              vote: RankedMapVoteStateView | null;
              launchMessage?: string | null;
              postMatch?: RankedMatchSessionView | null;
            }>
          >
        > | null;
        queueRes: Awaited<ReturnType<typeof secureApi<{ queue: RankedQueueStatusView }>>> | null;
        activityRes: Awaited<
          ReturnType<typeof secureApi<{ activities: RankedPartyActivityView[] }>>
        > | null;
        chatRes: Awaited<ReturnType<typeof secureApi<{ messages: RankedPartyMessageView[] }>>> | null;
      },
    ) => {
      const { partyRes, partiesRes, roomsRes, sessionRes, queueRes, activityRes, chatRes } =
        results;

      if (tier === "full" || tier === "session" || tier === "party") {
        if (partyRes?.ok) setParty(partyRes.data.party);
      }
      if (tier === "full" || tier === "rooms") {
        if (partiesRes?.ok) {
          setChallengeableParties(partiesRes.data.parties);
          setIncomingChallenges(partiesRes.data.challenges.incoming);
          setOutgoingChallenges(partiesRes.data.challenges.outgoing);
        }
        if (roomsRes?.ok) {
          setRooms(roomsRes.data.rooms);
          setRoomStats(roomsRes.data.stats);
          setEligibility(roomsRes.data.eligibility);
        }
      }
      if (tier === "full" || tier === "session") {
        if (sessionRes?.ok) {
          setSession(sessionRes.data.session);
          setVote(sessionRes.data.vote);
          setLaunchMessage(sessionRes.data.launchMessage ?? null);
          setPostMatch(sessionRes.data.postMatch ?? null);
        }
        if (queueRes?.ok) setQueue(queueRes.data.queue);
      }
      if (tier === "full" || tier === "party") {
        if (activityRes?.ok) {
          setPartyActivities(activityRes.data.activities);
        } else if (partyRes && !partyRes.ok) {
          setPartyActivities([]);
        }
        if (chatRes?.ok) {
          setPartyMessages(chatRes.data.messages);
        } else if (partyRes && !partyRes.ok) {
          setPartyMessages([]);
        }
      }
    },
    [],
  );

  const refresh = useCallback(
    async (tier: RankedRefreshTier = "full") => {
      if (!userId) {
        setParty(null);
        setSession(null);
        setVote(null);
        setPostMatch(null);
        setLaunchMessage(null);
        setQueue(null);
        setRooms([]);
        setEligibility(null);
        setPartyActivities([]);
        setPartyMessages([]);
        setLoading(false);
        return;
      }

      if (refreshInFlightRef.current) return;
      refreshInFlightRef.current = true;

      try {
        const needsParty = tier === "full" || tier === "party";
        const needsRooms = tier === "full" || tier === "rooms";
        const needsSession = tier === "full" || tier === "session";
        const needsRestriction = tier === "full";

        const [partyRes, partiesRes, roomsRes, sessionRes, queueRes, activityRes, chatRes] =
          await Promise.all([
            needsParty
              ? secureApi<{ party: RankedPartyView | null; session: RankedMatchSessionView | null }>(
                  "/api/ranked/party",
                )
              : Promise.resolve(null),
            needsRooms
              ? secureApi<{
                  parties: RankedPartyView[];
                  challenges: {
                    incoming: RankedChallengeView[];
                    outgoing: RankedChallengeView[];
                  };
                }>("/api/ranked/parties")
              : Promise.resolve(null),
            needsRooms
              ? secureApi<RankedRoomsResponse>("/api/ranked/rooms")
              : Promise.resolve(null),
            needsSession
              ? secureApi<{
                  session: RankedMatchSessionView | null;
                  vote: RankedMapVoteStateView | null;
                  launchMessage?: string | null;
                  postMatch?: RankedMatchSessionView | null;
                }>("/api/ranked/session")
              : Promise.resolve(null),
            needsSession
              ? secureApi<{ queue: RankedQueueStatusView }>("/api/ranked/queue")
              : Promise.resolve(null),
            needsParty
              ? secureApi<{ activities: RankedPartyActivityView[] }>(
                  "/api/ranked/party/activity",
                )
              : Promise.resolve(null),
            needsParty
              ? secureApi<{ messages: RankedPartyMessageView[] }>("/api/ranked/party/chat")
              : Promise.resolve(null),
          ]);

        applyTierResults(tier, {
          partyRes,
          partiesRes,
          roomsRes,
          sessionRes,
          queueRes,
          activityRes,
          chatRes,
        });

        if (needsRestriction) {
          await refreshRestriction();
        }
      } finally {
        refreshInFlightRef.current = false;
        setLoading(false);
      }
    },
    [applyTierResults, refreshRestriction, userId],
  );

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void refresh("full");
  }, [userId, refresh]);

  useEffect(() => {
    if (!userId || !isRankedPlayRoute(pathname)) return;
    void refresh("rooms");
  }, [pathname, userId, refresh]);

  const { connected: realtimeConnected } = useRealtimeStatus();

  useRealtimeInvalidate(
    (scope) => {
      if (pausePollingRef.current > 0) return;
      if (document.visibilityState === "hidden") return;
      void refresh(invalidateScopeToRefreshTier(scope));
    },
    Boolean(userId),
  );

  useRealtimeMatchLive((event) => {
    if (sessionRef.current?.id !== event.sessionId) return;
    setSession((prev) => {
      if (!prev || prev.id !== event.sessionId) return prev;
      return {
        ...prev,
        scoreTeamA: event.scoreTeamA,
        scoreTeamB: event.scoreTeamB,
        livePhase: event.phase,
        liveRound: event.round,
      };
    });
  }, Boolean(userId));

  useEffect(() => {
    if (!userId) return;

    const onPlayPage = isRankedPlayRoute(pathname);

    function poll() {
      if (pausePollingRef.current > 0) return;
      if (document.visibilityState === "hidden") return;
      if (refreshInFlightRef.current) return;

      if (realtimeConnected) {
        const needsSession =
          (isActiveRankedSession(sessionRef.current) &&
            sessionRef.current?.status !== "live") ||
          queueRef.current?.searching ||
          postMatchRef.current;
        if (needsSession) {
          void refresh("session");
        }
        return;
      }

      const tier = rankedPollTier(
        onPlayPage,
        sessionRef.current,
        queueRef.current,
        postMatchRef.current,
        Boolean(partyRef.current),
        pollTickRef.current,
      );
      pollTickRef.current += 1;
      void refresh(tier);
    }

    function onVisibility() {
      if (document.visibilityState !== "visible") return;
      void refresh(realtimeConnected ? "party" : "full");
    }

    document.addEventListener("visibilitychange", onVisibility);

    const intervalMs = realtimeConnected
      ? sessionRef.current?.status === "live"
        ? null
        : isActiveRankedSession(sessionRef.current) || queueRef.current?.searching || postMatchRef.current
          ? 12000
          : null
      : rankedPollIntervalMs(
          onPlayPage,
          sessionRef.current,
          queueRef.current,
          postMatchRef.current,
        );

    if (!intervalMs) {
      return () => document.removeEventListener("visibilitychange", onVisibility);
    }

    const interval = window.setInterval(poll, intervalMs);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [
    pathname,
    userId,
    refresh,
    realtimeConnected,
    session?.status,
    session?.serverHost,
    queue?.searching,
    postMatch?.id,
  ]);

  const refreshAll = useCallback(() => refresh("full"), [refresh]);

  const ensureParty = useCallback(async () => {
    setError(null);
    const result = await secureApi<{ party: RankedPartyView }>("/api/ranked/party", {
      method: "POST",
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setParty(result.data.party);
    await refreshAll();
  }, [refreshAll]);

  const joinParty = useCallback(
    async (inviteCode: string) => {
      setError(null);
      const result = await secureApi<{ party: RankedPartyView }>("/api/ranked/party/join", {
        method: "POST",
        json: { inviteCode },
      });
      if (!result.ok) {
        setError(result.error);
        return false;
      }
      setParty(result.data.party);
      await refreshAll();
      return true;
    },
    [refreshAll],
  );

  const createTeam = useCallback(
    async (config: RankedTeamConfigInput) => {
      setError(null);
      const result = await secureApi<{ party: RankedPartyView }>("/api/ranked/party", {
        method: "POST",
        json: config,
      });
      if (!result.ok) {
        setError(result.error);
        return false;
      }
      setParty(result.data.party);
      await refreshAll();
      return true;
    },
    [refreshAll],
  );

  const updateTeam = useCallback(
    async (config: RankedTeamConfigInput) => {
      setError(null);
      const result = await secureApi<{ party: RankedPartyView }>("/api/ranked/party", {
        method: "PATCH",
        json: config,
      });
      if (!result.ok) {
        setError(result.error);
        return false;
      }
      setParty(result.data.party);
      await refreshAll();
      return true;
    },
    [refreshAll],
  );

  const disbandTeam = useCallback(async () => {
    setError(null);
    const result = await secureApi("/api/ranked/party", { method: "DELETE" });
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    setParty(null);
    await refreshAll();
    return true;
  }, [refreshAll]);

  const joinRoom = useCallback(
    async (partyId: string, password?: string) => {
      setError(null);
      const result = await secureApi<{ party: RankedPartyView }>(
        `/api/ranked/rooms/${partyId}/join`,
        { method: "POST", json: password ? { password } : {} },
      );
      if (!result.ok) {
        setError(result.error);
        return false;
      }
      setParty(result.data.party);
      await refreshAll();
      return true;
    },
    [refreshAll],
  );

  const leaveParty = useCallback(async () => {
    setError(null);
    const result = await secureApi("/api/ranked/party/leave", { method: "POST" });
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    setParty(null);
    await refreshAll();
    return true;
  }, [refreshAll]);

  const kickMember = useCallback(
    async (userId: string) => {
      setError(null);
      const result = await secureApi<{ party: RankedPartyView }>("/api/ranked/party/kick", {
        method: "POST",
        json: { userId },
      });
      if (!result.ok) {
        setError(result.error);
        return false;
      }
      setParty(result.data.party);
      await refreshAll();
      return true;
    },
    [refreshAll],
  );

  const sendPartyMessage = useCallback(
    async (body: string) => {
      const trimmed = body.trim();
      if (!trimmed) return false;
      const result = await secureApi<{ messages: RankedPartyMessageView[] }>(
        "/api/ranked/party/chat",
        { method: "POST", json: { body: trimmed } },
      );
      if (!result.ok) {
        setError(result.error);
        return false;
      }
      setPartyMessages(result.data.messages);
      return true;
    },
    [],
  );

  const sendChallenge = useCallback(
    async (toPartyId: string) => {
      setError(null);
      const result = await secureApi<{ challenge: RankedChallengeView }>(
        "/api/ranked/challenges",
        { method: "POST", json: { toPartyId } },
      );
      if (!result.ok) {
        setError(result.error);
        return false;
      }
      await refreshAll();
      return true;
    },
    [refreshAll],
  );

  const respondChallenge = useCallback(
    async (challengeId: string, accept: boolean) => {
      setError(null);
      const result = await secureApi<{ accepted: boolean; session?: RankedMatchSessionView }>(
        `/api/ranked/challenges/${challengeId}/respond`,
        { method: "POST", json: { accept } },
      );
      if (!result.ok) {
        setError(result.error);
        return false;
      }
      if (result.data.session) setSession(result.data.session);
      await refreshAll();
      return true;
    },
    [refreshAll],
  );

  const acceptMatch = useCallback(async () => {
    if (!session) return false;
    setError(null);
    const result = await secureApi<{ session: RankedMatchSessionView }>(
      "/api/ranked/session",
      { method: "POST", json: { action: "accept", sessionId: session.id } },
    );
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    setSession(result.data.session);
    await refreshAll();
    return true;
  }, [refresh, session]);

  useEffect(() => {
    setDismissedVoteSessionId(null);
    setDismissedAcceptSessionId(null);
    setDismissedConnectSessionId(null);
  }, [session?.id]);

  const dismissVoteModal = useCallback(() => {
    if (session?.id) setDismissedVoteSessionId(session.id);
  }, [session?.id]);

  const dismissAcceptModal = useCallback(() => {
    if (session?.id) setDismissedAcceptSessionId(session.id);
  }, [session?.id]);

  const dismissConnectModal = useCallback(() => {
    if (session?.id) setDismissedConnectSessionId(session.id);
  }, [session?.id]);

  const reopenVoteModal = useCallback(() => {
    setDismissedVoteSessionId(null);
  }, []);

  const reopenAcceptModal = useCallback(() => {
    setDismissedAcceptSessionId(null);
  }, []);

  const reopenConnectModal = useCallback(() => {
    setDismissedConnectSessionId(null);
  }, []);

  const joinQueue = useCallback(async () => {
    setError(null);
    const result = await secureApi<{ queue: RankedQueueStatusView }>("/api/ranked/queue", {
      method: "POST",
      json: { action: "join" },
    });
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    setQueue(result.data.queue);
    await refreshAll();
    return true;
  }, [refreshAll]);

  const leaveQueue = useCallback(async () => {
    setError(null);
    const result = await secureApi<{ queue: RankedQueueStatusView }>("/api/ranked/queue", {
      method: "POST",
      json: { action: "leave" },
    });
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    setQueue(result.data.queue);
    await refreshAll();
    return true;
  }, [refreshAll]);

  const castVote = useCallback(
    async (map: string) => {
      if (!session) return false;
      setError(null);
      setVoteActionLoading(map);
      const result = await secureApi<{
        session: RankedMatchSessionView;
        vote: RankedMapVoteStateView;
        launchMessage?: string | null;
      }>("/api/ranked/session", {
        method: "POST",
        json: { action: "vote", sessionId: session.id, map },
      });
      setVoteActionLoading(null);
      if (!result.ok) {
        setError(result.error);
        return false;
      }
      setSession(result.data.session);
      setVote(result.data.vote);
      setLaunchMessage(result.data.launchMessage ?? null);
      window.dispatchEvent(new CustomEvent("clutch:notifications-refresh"));
      return true;
    },
    [session],
  );

  const cancelMatch = useCallback(async () => {
    if (!session) return false;
    const sessionId = session.id;
    setError(null);
    const result = await secureApi<{ ok: boolean; session: null; vote: null }>(
      "/api/ranked/session",
      {
        method: "POST",
        json: { action: "cancel", sessionId },
      },
    );
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    setSession(null);
    setVote(null);
    setLaunchMessage(null);
    setDismissedVoteSessionId(sessionId);
    setDismissedAcceptSessionId(sessionId);
    setDismissedConnectSessionId(sessionId);
    await refreshAll();
    return true;
  }, [session, refreshAll]);

  const finishMatch = useCallback(async () => {
    if (!session) return false;
    setFinishLoading(true);
    setError(null);
    const result = await secureApi<{ session: RankedMatchSessionView; postMatch: RankedMatchSessionView }>(
      "/api/ranked/session",
      { method: "POST", json: { action: "finish", sessionId: session.id } },
    );
    setFinishLoading(false);
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    setSession(null);
    setVote(null);
    setPostMatch(result.data.postMatch);
    setDismissedConnectSessionId(session.id);
    await refreshAll();
    return true;
  }, [session, refreshAll]);

  const rematch = useCallback(async () => {
    if (!postMatch) return false;
    setPostMatchActionLoading("rematch");
    setError(null);
    const result = await secureApi<{ session: RankedMatchSessionView }>("/api/ranked/session", {
      method: "POST",
      json: { action: "rematch", sessionId: postMatch.id },
    });
    setPostMatchActionLoading(null);
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    setPostMatch(null);
    setSession(result.data.session);
    setDismissedPostMatchSessionId(postMatch.id);
    await refreshAll();
    return true;
  }, [postMatch, refreshAll]);

  const swapRematch = useCallback(async () => {
    if (!postMatch) return false;
    setPostMatchActionLoading("swap");
    setError(null);
    const result = await secureApi<{ session: RankedMatchSessionView }>("/api/ranked/session", {
      method: "POST",
      json: { action: "swap-rematch", sessionId: postMatch.id },
    });
    setPostMatchActionLoading(null);
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    setPostMatch(null);
    setSession(result.data.session);
    setDismissedPostMatchSessionId(postMatch.id);
    await refreshAll();
    return true;
  }, [postMatch, refreshAll]);

  const leaveMatchRoomAction = useCallback(async () => {
    setPostMatchActionLoading("leave");
    setError(null);
    const result = await secureApi("/api/ranked/session", {
      method: "POST",
      json: { action: "leave-room" },
    });
    setPostMatchActionLoading(null);
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    setPostMatch(null);
    setParty(null);
    setDismissedPostMatchSessionId(null);
    await refreshAll();
    return true;
  }, [refreshAll]);

  const forceClearStuckMatch = useCallback(async () => {
    setError(null);
    const result = await secureApi<{ ok: boolean; cleared: number }>("/api/ranked/session", {
      method: "POST",
      json: { action: "force-clear" },
    });
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    setSession(null);
    setVote(null);
    setLaunchMessage(null);
    setPostMatch(null);
    setDismissedVoteSessionId(null);
    setDismissedAcceptSessionId(null);
    setDismissedConnectSessionId(null);
    setDismissedPostMatchSessionId(null);
    await refreshAll();
    return true;
  }, [refreshAll]);

  const voteModalOpen = Boolean(session && session.status === "voting" && vote);

  const acceptModalOpen = Boolean(session && session.status === "accepting");

  const connectModalOpen = Boolean(
    session &&
      (session.status === "live" ||
        (session.status === "starting" && session.serverHost && session.serverPort)) &&
      session.serverHost &&
      session.serverPort,
  );

  const voteModalVisible =
    voteModalOpen && session != null && dismissedVoteSessionId !== session.id;

  const acceptModalVisible =
    acceptModalOpen && session != null && dismissedAcceptSessionId !== session.id;

  const connectModalVisible =
    connectModalOpen && session != null && dismissedConnectSessionId !== session.id;

  const postMatchModalVisible =
    Boolean(postMatch && !session) &&
    postMatch != null &&
    dismissedPostMatchSessionId !== postMatch.id;

  const dismissPostMatchModal = useCallback(() => {
    if (postMatch?.id) setDismissedPostMatchSessionId(postMatch.id);
  }, [postMatch?.id]);

  const value = useMemo(
    () => ({
      party,
      session,
      vote,
      launchMessage,
      challengeableParties,
      incomingChallenges,
      outgoingChallenges,
      partyActivities,
      partyMessages,
      restriction,
      queue,
      loading,
      error,
      refresh: refreshAll,
      ensureParty,
      createTeam,
      updateTeam,
      disbandTeam,
      joinParty,
      joinRoom,
      leaveParty,
      kickMember,
      sendPartyMessage,
      sendChallenge,
      respondChallenge,
      acceptMatch,
      joinQueue,
      leaveQueue,
      castVote,
      cancelMatch,
      finishMatch,
      rematch,
      swapRematch,
      leaveMatchRoom: leaveMatchRoomAction,
      forceClearStuckMatch,
      rooms,
      roomStats,
      eligibility,
      postMatch,
      postMatchModalVisible,
      dismissPostMatchModal,
      voteActionLoading,
      voteModalVisible,
      acceptModalVisible,
      connectModalVisible,
      dismissVoteModal,
      dismissAcceptModal,
      dismissConnectModal,
      reopenVoteModal,
      reopenAcceptModal,
      reopenConnectModal,
      pausePolling,
      resumePolling,
    }),
    [
      party,
      session,
      vote,
      launchMessage,
      challengeableParties,
      rooms,
      roomStats,
      eligibility,
      incomingChallenges,
      outgoingChallenges,
      partyActivities,
      partyMessages,
      restriction,
      queue,
      loading,
      error,
      refreshAll,
      ensureParty,
      createTeam,
      updateTeam,
      disbandTeam,
      joinParty,
      joinRoom,
      leaveParty,
      kickMember,
      sendPartyMessage,
      sendChallenge,
      respondChallenge,
      acceptMatch,
      joinQueue,
      leaveQueue,
      castVote,
      cancelMatch,
      finishMatch,
      rematch,
      swapRematch,
      leaveMatchRoomAction,
      forceClearStuckMatch,
      postMatch,
      postMatchModalVisible,
      dismissPostMatchModal,
      voteActionLoading,
      voteModalVisible,
      acceptModalVisible,
      connectModalVisible,
      dismissVoteModal,
      dismissAcceptModal,
      dismissConnectModal,
      reopenVoteModal,
      reopenAcceptModal,
      reopenConnectModal,
      pausePolling,
      resumePolling,
    ],
  );

  return (
    <RankedPartyContext.Provider value={value}>
      {session && session.status === "accepting" && (
        <RankedAcceptModal
          open={acceptModalVisible}
          session={session}
          onAccept={() => void acceptMatch()}
          onCancel={() => void cancelMatch()}
          onClose={dismissAcceptModal}
        />
      )}
      {session && vote && (
        <RankedVoteModal
          open={voteModalVisible}
          session={session}
          vote={vote}
          launchMessage={launchMessage}
          actionLoading={voteActionLoading}
          onPickMap={(map) => void castVote(map)}
          onClose={dismissVoteModal}
        />
      )}
      {session && (
        <RankedConnectModal
          open={connectModalVisible}
          session={session}
          onClose={dismissConnectModal}
          onFinish={() => void finishMatch()}
          finishLoading={finishLoading}
        />
      )}
      {postMatch && (
        <RankedPostMatchModal
          open={postMatchModalVisible}
          session={postMatch}
          loading={postMatchActionLoading}
          onRematch={() => void rematch()}
          onSwapRematch={() => void swapRematch()}
          onLeaveRoom={() => void leaveMatchRoomAction()}
          onClose={dismissPostMatchModal}
        />
      )}
      {children}
    </RankedPartyContext.Provider>
  );
}

export function useRankedPartyOptional() {
  return useContext(RankedPartyContext);
}

export function useRankedParty() {
  const ctx = useContext(RankedPartyContext);
  if (!ctx) throw new Error("useRankedParty must be used within RankedPartyProvider");
  return ctx;
}

export { RANKED_TEAM_SIZE, formatRestrictionDuration };
