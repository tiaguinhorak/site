"use client";

import dynamic from "next/dynamic";
import { SkeletonCard } from "@/components/ui/skeleton";

const InventorySection = dynamic(
  () =>
    import("@/components/dashboard/inventory-section").then((mod) => ({
      default: mod.InventorySection,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-6">
        <SkeletonCard className="h-40" />
        <SkeletonCard className="h-24" />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonCard key={i} className="h-32" />
          ))}
        </div>
      </div>
    ),
  },
);

export function InventorySectionClient() {
  return <InventorySection />;
}
