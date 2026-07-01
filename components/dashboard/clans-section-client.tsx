"use client";

import dynamic from "next/dynamic";
import { SkeletonCard } from "@/components/ui/skeleton";

const Section = dynamic(
  () => import("@/components/dashboard/clans-section").then((m) => ({ default: m.ClansSection })),
  { ssr: false, loading: () => <SkeletonCard className="h-96" /> },
);

export function ClansSectionClient() {
  return <Section />;
}
