import { Trophy, Calendar, Target } from "lucide-react";

export function SeasonInfo() {
  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
      {[
        {
          icon: Trophy,
          label: "Temporada atual",
          value: "Season 8",
          detail: "Ranking global resetado em 1 de junho",
        },
        {
          icon: Calendar,
          label: "Duração",
          value: "90 dias",
          detail: "Próximo reset estimado para setembro",
        },
        {
          icon: Target,
          label: "Modalidades",
          value: "5 modos",
          detail: "Retakes, DM, Duels, Wingman e 5x5",
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
