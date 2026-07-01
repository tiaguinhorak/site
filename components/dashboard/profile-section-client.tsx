"use client";

import dynamic from "next/dynamic";
import { SkeletonCard } from "@/components/ui/skeleton";

const Section = dynamic(
  () => import("@/components/dashboard/profile-section").then((m) => ({ default: m.ProfileSection })),
  { ssr: false, loading: () => <SkeletonCard className="h-96" /> },
);

export function ProfileSectionClient() {
  return <Section />;
}
