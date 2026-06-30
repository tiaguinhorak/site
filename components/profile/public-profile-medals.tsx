import { Award, Crosshair, Sparkles, Star, Swords, Trophy, type LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { PublicMedal } from "@/lib/achievements/service";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  Swords,
  Trophy,
  Crosshair,
  Star,
  Sparkles,
  Award,
};

const TIER_STYLES: Record<PublicMedal["tier"], string> = {
  BRONZE: "from-amber-700/40 to-amber-500/20 text-amber-300",
  SILVER: "from-slate-400/40 to-slate-200/20 text-slate-200",
  GOLD: "from-yellow-500/40 to-yellow-300/20 text-yellow-300",
  PLATINUM: "from-cyan-400/40 to-cyan-200/20 text-cyan-200",
  DIAMOND: "from-fuchsia-500/40 to-violet-400/20 text-fuchsia-200",
};

export async function PublicProfileMedals({
  medals,
  level,
}: {
  medals: PublicMedal[];
  level: number;
}) {
  const t = await getTranslations("publicProfile");

  return (
    <section className="rounded-card glass-strong p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-foreground">{t("medalsTitle")}</h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          {t("levelBadge", { level })}
        </span>
      </div>

      {medals.length === 0 ? (
        <p className="text-sm text-muted">{t("noMedals")}</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {medals.map((medal) => {
            const Icon = (medal.icon && ICONS[medal.icon]) || Award;
            return (
              <div
                key={medal.code}
                title={medal.title}
                className="flex items-center gap-2 rounded-xl border border-border/50 bg-black/20 px-3 py-2"
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br",
                    TIER_STYLES[medal.tier],
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium text-foreground">{medal.title}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
