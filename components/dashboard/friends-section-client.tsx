"use client";

import dynamic from "next/dynamic";
import { SkeletonCard } from "@/components/ui/skeleton";

const Section = dynamic(
  () => import("@/components/dashboard/friends-section").then((m) => ({ default: m.FriendsSection })),
  { ssr: false, loading: () => <SkeletonCard className="h-96" /> },
);

export function FriendsSectionClient() {
  return <Section />;
}
