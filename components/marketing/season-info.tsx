import { Trophy, Calendar, Target } from "lucide-react";
import { getPublicActiveSeasonSummary } from "@/lib/ranked/season-service";

function formatDuration(startsAt: string, endsAt: string | null, resetAt: string | null): string {
  const fmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });
  if (resetAt) return `Reset em ${fmt.format(new Date(resetAt))}`;
  if (endsAt) return `Até ${fmt.format(new Date(endsAt))}`;
  return `Desde ${fmt.format(new Date(startsAt))}`;
}

export async function SeasonInfo() {
  const season = await getPublicActiveSeasonSummary();

  const items = season
    ? [
        {
          icon: Trophy,
          label: "Temporada atual",
          value: season.name,
          detail: season.description || `Season ${season.seasonNumber} — ranking rankeado 5v5`,
        },
        {
          icon: Calendar,
          label: "Duração / reset",
          value: formatDuration(season.startsAt, season.endsAt, season.resetAt),
          detail: season.durationLabel,
        },
        {
          icon: Target,
          label: "Conta para ranking",
          value: "Apenas rankeado",
          detail:
            season.prizes.length > 0
              ? `Top 3 recebe premiação ao fim da season (${season.prizes.length} prêmio(s) configurado(s))`
              : "Partidas 5v5 rankeadas — pontos e ELO",
        },
      ]
    : [
        {
          icon: Trophy,
          label: "Temporada atual",
          value: "Em breve",
          detail: "Nenhuma temporada ativa no momento",
        },
        {
          icon: Calendar,
          label: "Duração",
          value: "—",
          detail: "Aguardando nova season",
        },
        {
          icon: Target,
          label: "Conta para ranking",
          value: "Rankeado 5v5",
          detail: "Pontos e ELO em partidas oficiais",
        },
      ];

  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="rounded-card glass p-5">
            <Icon className="h-5 w-5 text-primary" />
            <p className="mt-3 text-xs uppercase tracking-wider text-muted">{item.label}</p>
            <p className="mt-1 font-display text-xl font-bold text-foreground">{item.value}</p>
            <p className="mt-2 text-xs text-muted">{item.detail}</p>
          </div>
        );
      })}
    </div>
  );
}
