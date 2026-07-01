"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { Features } from "@/components/sections/features";
import { SkeletonCard } from "@/components/ui/skeleton";

type Stat = { value: string; label: string };
type Feature = ComponentProps<typeof Features>["features"][number];

export function PlataformaMarketingClient() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/marketing/platform", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { stats: [], features: [] }))
      .then((json: { stats: Stat[]; features: Feature[] }) => {
        setStats(json.stats ?? []);
        setFeatures(json.features ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCard className="h-32" />
        <SkeletonCard className="h-96" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-card glass px-4 py-5 text-center">
            <p className="font-display text-2xl font-bold text-gradient sm:text-3xl">{stat.value}</p>
            <p className="mt-1 text-xs uppercase tracking-wider text-muted">{stat.label}</p>
          </div>
        ))}
      </div>
      <Features embedded features={features} />
    </>
  );
}
