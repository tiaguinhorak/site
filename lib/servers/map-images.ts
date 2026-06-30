/** CS:GO legacy map icons extracted from game files (Juknum / vgalisson / MurkyYT). */
const JUKNUM_CSGO_SVG_BASE =
  "https://raw.githubusercontent.com/Juknum/counter-strike-icons/main/csgo/materials/panorama/images/map_icons";

const VGALISSON_PNG_BASE =
  "https://raw.githubusercontent.com/vgalisson/csgo-map-icons/master/80x80";

const CS2_PNG_BASE =
  "https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images";

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
  de_office: "Office",
  de_italy: "Italy",
  cs_office: "Office",
  cs_italy: "Italy",
};

const MAP_ID_PREFIX = /^(de_|cs_|ar_|awp_|surf_|kz_|fy_)/;

export function resolveMapId(mapIdOrLabel: string | null | undefined): string {
  if (!mapIdOrLabel) return "";
  const trimmed = mapIdOrLabel.trim();
  if (!trimmed || trimmed === "—" || trimmed.toLowerCase() === "offline") return "";

  const lower = trimmed.toLowerCase();
  if (MAP_ID_PREFIX.test(lower)) return lower;

  for (const [id, label] of Object.entries(MAP_LABELS)) {
    if (label.toLowerCase() === lower || id === lower) return id;
  }

  const compact = lower.replace(/\s+/g, "");
  for (const [id, label] of Object.entries(MAP_LABELS)) {
    if (label.toLowerCase().replace(/\s+/g, "") === compact) return id;
  }

  return lower.replace(/\s+/g, "_");
}

/** Ordered fallbacks — first URL is preferred for <img src>. */
export function getMapIconUrls(mapIdOrLabel: string): string[] {
  const id = resolveMapId(mapIdOrLabel);
  if (!id) return [];

  const urls: string[] = [];

  if (id.startsWith("de_")) {
    urls.push(`${VGALISSON_PNG_BASE}/collection_icon_${id}.png`);
  }

  urls.push(`${CS2_PNG_BASE}/${id}.png`);
  urls.push(`${JUKNUM_CSGO_SVG_BASE}/map_icon_${id}.svg`);

  return [...new Set(urls)];
}

export function getMapIconUrl(mapIdOrLabel: string): string | null {
  const urls = getMapIconUrls(mapIdOrLabel);
  return urls[0] ?? null;
}
