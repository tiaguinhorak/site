import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { InfrastructurePanel } from "@/components/marketing/infrastructure-panel";
import { Servers } from "@/components/sections/servers";
import { CallToAction } from "@/components/sections/cta";
import { getPublicServers, getSiteStats } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Servidores — clutchclube",
  description:
    "65 servidores de alta performance em São Paulo com 10 Gbps e 18ms de ping.",
};

export default async function ServidoresPage() {
  const servers = await getPublicServers();
  const stats = await getSiteStats();
  const serverCount = stats[0]?.value ?? "65+";

  return (
    <>
      <MarketingPageShell
        eyebrow="Infraestrutura"
        title={
          <>
            Servidores de{" "}
            <span className="text-gradient">alta performance</span>
          </>
        }
        description="Hospedados em São Paulo com links dedicados de 10 Gbps e 18ms de ping médio no Brasil."
      >
        <InfrastructurePanel serverCount={serverCount} />
        <div className="mt-10">
          <Servers
            embedded
            servers={servers.map((s) => ({
              name: s.name,
              map: s.map,
              mode: s.mode,
              players: s.players,
              slots: s.slots,
              ping: s.ping,
            }))}
          />
        </div>
      </MarketingPageShell>
      <CallToAction />
    </>
  );
}
