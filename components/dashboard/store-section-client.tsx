"use client";

import dynamic from "next/dynamic";
import { SkeletonCard } from "@/components/ui/skeleton";

const Section = dynamic(
  () => import("@/components/dashboard/store-section").then((m) => ({ default: m.StoreSection })),
  { ssr: false, loading: () => <SkeletonCard className="h-96" /> },
);

export function StoreSectionClient() {
  return <Section />;
}
