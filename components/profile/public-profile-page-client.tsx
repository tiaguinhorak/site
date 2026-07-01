"use client";

import dynamic from "next/dynamic";
import { SkeletonCard } from "@/components/ui/skeleton";

const PublicProfileContent = dynamic(
  () =>
    import("@/components/profile/public-profile-content").then((mod) => ({
      default: mod.PublicProfileContent,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-6">
        <SkeletonCard className="h-56" />
        <SkeletonCard className="h-40" />
        <SkeletonCard className="h-64" />
      </div>
    ),
  },
);

export function PublicProfilePageClient({ nickname }: { nickname: string }) {
  return (
    <div className="layout-container space-y-6 pb-24 pt-28 sm:pt-32">
      <PublicProfileContent nickname={nickname} />
    </div>
  );
}
