"use client";

import { useEffect, useState } from "react";
import { Hero } from "@/components/sections/hero";
import { SkeletonCard } from "@/components/ui/skeleton";

type Stat = { value: string; label: string };

export function HomeHeroClient() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/marketing/stats", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { stats: [] }))
      .then((json: { stats: Stat[] }) => setStats(json.stats ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <SkeletonCard className="h-[420px]" />;
  }

  return <Hero stats={stats} />;
}
