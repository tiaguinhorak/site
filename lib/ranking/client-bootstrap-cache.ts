import type { RankingBootstrapPayload } from "@/lib/ranking/ranking-bootstrap";

let inflight: Promise<RankingBootstrapPayload | null> | null = null;

export async function fetchRankingBootstrapDeduped(): Promise<RankingBootstrapPayload | null> {
  if (!inflight) {
    inflight = fetch("/api/ranking/bootstrap", {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as RankingBootstrapPayload;
      })
      .catch(() => null)
      .finally(() => {
        inflight = null;
      });
  }

  return inflight;
}
