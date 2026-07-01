export type RealtimeInvalidateScope =
  | "full"
  | "session"
  | "party"
  | "rooms"
  | "chat"
  | "activity";

export type RealtimeChannel =
  | { kind: "user"; userId: string }
  | { kind: "party"; partyId: string }
  | { kind: "ranked_rooms" }
  | { kind: "lobby_rooms" };

export type DirectMessagePayload = {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
};

export type RankedInvitePayload = {
  partyId: string;
  inviteCode: string;
  fromUserId: string;
  fromDisplayName: string;
  fromAvatarUrl: string | null;
  partyName: string;
};

export type RealtimeEvent =
  | { type: "connected"; at: number }
  | { type: "ping"; at: number }
  | { type: "invalidate"; scope: RealtimeInvalidateScope; at: number }
  | {
      type: "match_live";
      at: number;
      sessionId: string;
      scoreTeamA: number;
      scoreTeamB: number;
      round: number;
      phase: string;
    }
  | { type: "presence"; at: number; userId: string; online: boolean }
  | { type: "dm"; at: number; message: DirectMessagePayload }
  | { type: "ranked_invite"; at: number; invite: RankedInvitePayload };

export function channelKey(channel: RealtimeChannel): string {
  switch (channel.kind) {
    case "user":
      return `user:${channel.userId}`;
    case "party":
      return `party:${channel.partyId}`;
    case "ranked_rooms":
      return "ranked_rooms";
    case "lobby_rooms":
      return "lobby_rooms";
    default: {
      const _exhaustive: never = channel;
      return _exhaustive;
    }
  }
}
