import { Trophy, Calendar, Target } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function SeasonInfo() {
  const t = await getTranslations("seasonInfo");
  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
      {[
        {
          icon: Trophy,
          label: t("currentSeasonLabel"),
          value: t("currentSeasonValue"),
          detail: t("currentSeasonDetail"),
        },
        {
          icon: Calendar,
          label: t("durationLabel"),
          value: t("durationValue"),
          detail: t("durationDetail"),
        },
        {
          icon: Target,
          label: t("modesLabel"),
          value: t("modesValue"),
          detail: t("modesDetail"),
        },
      ].map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="rounded-card glass p-5">
            <Icon className="h-5 w-5 text-primary" />
            <p className="mt-3 text-xs uppercase tracking-wider text-muted">
              {item.label}
            </p>
            <p className="mt-1 font-display text-xl font-bold text-foreground">
              {item.value}
            </p>
            <p className="mt-2 text-xs text-muted">{item.detail}</p>
          </div>
        );
      })}
    </div>
  );
}
