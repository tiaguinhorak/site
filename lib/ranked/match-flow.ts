import type { RankedMatchSessionView } from "@/lib/ranked/party-shared";

export type RankedFlowStep =
  | "idle"
  | "queue"
  | "accepting"
  | "voting"
  | "starting"
  | "live";

export const RANKED_FLOW_STEPS: RankedFlowStep[] = [
  "queue",
  "accepting",
  "voting",
  "starting",
  "live",
];

export function deriveRankedFlowStep(params: {
  session: RankedMatchSessionView | null;
  queueSearching: boolean;
}): RankedFlowStep {
  const { session, queueSearching } = params;

  if (session?.status === "accepting") return "accepting";
  if (session?.status === "voting") return "voting";
  if (session?.status === "starting") return "starting";
  if (session?.status === "live") return "live";
  if (queueSearching) return "queue";

  return "idle";
}

export function isActiveRankedFlow(step: RankedFlowStep): boolean {
  return step !== "idle";
}

export function sessionHasLiveScore(session: RankedMatchSessionView | null): boolean {
  if (!session) return false;
  return (
    session.status === "live" &&
    session.scoreTeamA != null &&
    session.scoreTeamB != null
  );
}

export function formatLiveScore(session: RankedMatchSessionView): string {
  const a = session.scoreTeamA ?? 0;
  const b = session.scoreTeamB ?? 0;
  return `${a} : ${b}`;
}
