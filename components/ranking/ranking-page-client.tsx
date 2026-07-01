"use client";

import dynamic from "next/dynamic";
import { SeasonInfoFallback } from "@/components/marketing/season-info-fallback";
import { SkeletonCard } from "@/components/ui/skeleton";

const RankingPageContent = dynamic(
  () =>
    import("@/components/ranking/ranking-page-content").then((mod) => ({
      default: mod.RankingPageContent,
    })),
  {
    ssr: false,
    loading: () => (
      <div>
        <SeasonInfoFallback />
        <div className="mt-6 flex justify-end">
          <SkeletonCard className="h-9 w-9 rounded-xl" />
        </div>
        <div className="mt-4 space-y-4">
          <SkeletonCard className="h-24" />
          <SkeletonCard className="h-12" />
          <SkeletonCard className="h-96" />
        </div>
      </div>
    ),
  },
);

type RankingPageClientProps = {
  variant?: "dashboard" | "marketing";
  className?: string;
};

export function RankingPageClient({
  variant = "dashboard",
  className,
}: RankingPageClientProps) {
  return <RankingPageContent variant={variant} className={className} />;
}
