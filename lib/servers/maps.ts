const MAP_LABELS: Record<string, string> = {
  de_dust2: "Dust II",
  de_mirage: "Mirage",
  de_inferno: "Inferno",
  de_nuke: "Nuke",
  de_overpass: "Overpass",
  de_ancient: "Ancient",
  de_anubis: "Anubis",
  de_vertigo: "Vertigo",
  de_train: "Train",
  de_cache: "Cache",
};

export function formatMapLabel(mapId: string | null | undefined): string {
  if (!mapId) return "—";
  const normalized = mapId.toLowerCase();
  if (MAP_LABELS[normalized]) return MAP_LABELS[normalized];
  return normalized.replace(/^de_/, "").replace(/_/g, " ");
}
