import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { InfrastructurePanel } from "@/components/marketing/infrastructure-panel";
import { Servers } from "@/components/sections/servers";
import { CallToAction } from "@/components/sections/cta";
import { getPublicServers, getSiteStats } from "@/lib/queries";
import { localizeSiteStats } from "@/lib/marketing/localize-content";
import { getRequestLocale } from "@/lib/i18n/server";
import { formatMapLabel } from "@/lib/servers/maps";

export const metadata: Metadata = {
  title: "Servidores — clutchclube",
  description:
    "65 servidores de alta performance em São Paulo com 10 Gbps e 18ms de ping.",
};

export default async function ServidoresPage() {
  const t = await getTranslations("marketing");
  const locale = await getRequestLocale();
  const servers = await getPublicServers();
  const stats = await localizeSiteStats(await getSiteStats(), locale);
  const serverCount = stats[0]?.value ?? "65+";

  return (
    <>
      <MarketingPageShell
        eyebrow={t("servidoresEyebrow")}
        title={
          <>
            {t("servidoresTitleA")}{" "}
            <span className="text-gradient">{t("servidoresTitleB")}</span>
          </>
        }
        description={t("servidoresDesc")}
      >
        <InfrastructurePanel serverCount={serverCount} />
        <div className="mt-10">
          <Servers
            embedded
            servers={servers.map((s) => ({
              name: s.name,
              map: formatMapLabel(s.map),
              mode: s.mode,
              players: s.players,
              slots: s.slots,
              ping: s.ping,
              host: s.host,
              port: s.port,
              isLiveSynced: s.isLiveSynced,
            }))}
          />
        </div>
      </MarketingPageShell>
      <CallToAction />
    </>
  );
}
