"use client";

import dynamic from "next/dynamic";
import { SkeletonCard } from "@/components/ui/skeleton";

const Section = dynamic(
  () => import("@/components/dashboard/lobby-section").then((m) => ({ default: m.LobbySection })),
  { ssr: false, loading: () => <SkeletonCard className="h-96" /> },
);

export function LobbySectionClient() {
  return <Section />;
}
