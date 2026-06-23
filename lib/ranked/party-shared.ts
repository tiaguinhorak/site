export type RankedPartyMemberView = {
  id: string;
  nickname: string;
  elo: number;
  avatarUrl: string | null;
  avatarInitials: string;
  slotIndex: number;
  isLeader: boolean;
  isYou: boolean;
  canKick: boolean;
};

export type RankedPartyView = {
  id: string;
  name: string;
  inviteCode: string;
  status: "open" | "full" | "in_match" | "disbanded";
  leaderUserId: string;
  leaderNickname: string;
  memberCount: number;
  slots: number;
  avgLevel: number;
  region: string;
  visibility: "public" | "private";
  hasPassword: boolean;
  minLevel: number;
  maxLevel: number;
  mapPool: string[];
  isLeader: boolean;
  isMember: boolean;
  members: RankedPartyMemberView[];
};

export const RANKED_REGION_OPTIONS = ["BR", "AR", "UY", "CL", "CO", "PE"] as const;

export type RankedTeamConfigInput = {
  name?: string;
  region?: string;
  visibility?: "public" | "private";
  password?: string;
  clearPassword?: boolean;
  minLevel?: number;
  maxLevel?: number;
  mapPool?: string[];
};

export type RankedEligibility = {
  steamLinked: boolean;
  hasPlan: boolean;
  canPlay: boolean;
};

export type RankedRoomsResponse = {
  rooms: RankedPartyView[];
  eligibility: RankedEligibility;
  stats: {
    available: number;
    full: number;
    inMatch: number;
    players: number;
  };
};

export type RankedChallengeView = {
  id: string;
  fromPartyId: string;
  toPartyId: string;
  status: "pending" | "accepted" | "declined" | "expired" | "cancelled";
  expiresAt: string;
  fromLeaderNickname: string;
  toLeaderNickname: string;
  isIncoming: boolean;
  isOutgoing: boolean;
};

export type RankedMatchSessionView = {
  id: string;
  status: "accepting" | "voting" | "starting" | "live" | "cancelled" | "finished";
  matchSource: "challenge" | "queue" | "lobby";
  teamSize: number;
  lobbyRoomId: string | null;
  csgoMatchId: string | null;
  selectedMap: string | null;
  serverHost: string | null;
  serverPort: number | null;
  connectAddress: string | null;
  connectCommand: string | null;
  partyA: RankedPartyView;
  partyB: RankedPartyView;
  acceptances: {
    userId: string;
    nickname: string;
    accepted: boolean;
    isYou: boolean;
  }[];
  acceptedCount: number;
  requiredCount: number;
  youAccepted: boolean;
  yourTeam: "A" | "B" | null;
  isCaptain: boolean;
  scoreTeamA?: number | null;
  scoreTeamB?: number | null;
  winnerTeam?: string | null;
  livePhase?: string | null;
  liveRound?: number | null;
};

export type RankedMapVoteOption = {
  map: string;
  votes: number;
  voters: string[];
  isYourVote: boolean;
};

export type RankedMapVoteStateView = {
  options: RankedMapVoteOption[];
  yourVote: string | null;
  totalVotes: number;
  requiredCount: number;
  votedCount: number;
  secondsLeft: number;
  endsAt: string | null;
  isComplete: boolean;
  selectedMap: string | null;
};
