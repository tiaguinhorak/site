"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { GameModes } from "@/components/sections/game-modes";
import { SkeletonCard } from "@/components/ui/skeleton";

type Mode = ComponentProps<typeof GameModes>["modes"][number];

export function ModosMarketingClient() {
  const [modes, setModes] = useState<Mode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/marketing/game-modes", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { modes: [] }))
      .then((json: { modes: Mode[] }) => setModes(json.modes ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonCard className="h-96" />;
  return <GameModes embedded modes={modes} />;
}
