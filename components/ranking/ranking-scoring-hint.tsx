import { RankingScoringHintClient } from "@/components/ranking/ranking-scoring-hint-client";
import { getRankingScoringLabels } from "@/lib/ranking/ranking-scoring-labels";

type RankingScoringHintProps = {
  className?: string;
};

export async function RankingScoringHint({ className }: RankingScoringHintProps) {
  const labels = await getRankingScoringLabels();

  return <RankingScoringHintClient className={className} labels={labels} />;
}
