"use client";

import { useEffect, useState } from "react";
import { InfrastructurePanel } from "@/components/marketing/infrastructure-panel";
import { Servers } from "@/components/sections/servers";
import { SkeletonCard } from "@/components/ui/skeleton";

type ServerRow = {
  name: string;
  map: string;
  mode: string;
  players: number;
  slots: number;
  ping: number;
  host: string;
  port: number;
  isLiveSynced: boolean;
};

export function ServersMarketingClient() {
  const [serverCount, setServerCount] = useState("65+");
  const [servers, setServers] = useState<ServerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/marketing/servers", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { serverCount?: string; servers?: ServerRow[] } | null) => {
        if (!json) return;
        setServerCount(json.serverCount ?? "65+");
        setServers(json.servers ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCard className="h-40" />
        <SkeletonCard className="h-96" />
      </div>
    );
  }

  return (
    <>
      <InfrastructurePanel serverCount={serverCount} />
      <div className="mt-10">
        <Servers embedded servers={servers} />
      </div>
    </>
  );
}
