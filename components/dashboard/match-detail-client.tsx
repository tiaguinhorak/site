"use client";

import dynamic from "next/dynamic";
import { SkeletonCard } from "@/components/ui/skeleton";

const MatchDetailContent = dynamic(
  () =>
    import("@/components/dashboard/match-detail-content").then((mod) => ({
      default: mod.MatchDetailContent,
    })),
  {
    ssr: false,
    loading: () => <SkeletonCard className="h-[520px]" />,
  },
);

export function MatchDetailClient({ matchId }: { matchId: string }) {
  return <MatchDetailContent matchId={matchId} />;
}
