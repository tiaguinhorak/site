export type GradientPreset = {
  id: string;
  label: string;
  classes: string;
  from: string;
  to: string;
};

export const GRADIENT_PRESETS: GradientPreset[] = [
  { id: "violet-purple", label: "Violeta Royal", classes: "from-violet-600 to-purple-800", from: "#7c3aed", to: "#6b21a8" },
  { id: "fuchsia-violet", label: "Fuchsia Pulse", classes: "from-fuchsia-600 to-violet-700", from: "#c026d3", to: "#6d28d9" },
  { id: "indigo-purple", label: "Indigo Night", classes: "from-indigo-600 to-purple-700", from: "#4f46e5", to: "#7e22ce" },
  { id: "purple-fuchsia", label: "Purple Blaze", classes: "from-purple-600 to-fuchsia-600", from: "#9333ea", to: "#c026d3" },
  { id: "violet-fuchsia", label: "Violet Storm", classes: "from-violet-500 to-fuchsia-500", from: "#8b5cf6", to: "#d946ef" },
  { id: "emerald-cyan", label: "Emerald Wave", classes: "from-emerald-500 via-cyan-500 to-violet-600", from: "#10b981", to: "#7c3aed" },
  { id: "amber-orange", label: "Sunset Gold", classes: "from-amber-500 to-orange-600", from: "#f59e0b", to: "#ea580c" },
  { id: "rose-red", label: "Crimson Fire", classes: "from-rose-500 to-red-700", from: "#f43f5e", to: "#b91c1c" },
  { id: "cyan-blue", label: "Ocean Blue", classes: "from-cyan-500 to-blue-600", from: "#06b6d4", to: "#2563eb" },
  { id: "slate-zinc", label: "Steel Gray", classes: "from-slate-500 to-zinc-700", from: "#64748b", to: "#3f3f46" },
  { id: "pink-purple", label: "Neon Pink", classes: "from-pink-500 via-purple-500 to-indigo-500", from: "#ec4899", to: "#6366f1" },
  { id: "teal-emerald", label: "Teal Mint", classes: "from-teal-500 to-emerald-600", from: "#14b8a6", to: "#059669" },
];

export const DEFAULT_GRADIENT = GRADIENT_PRESETS[0];

export function findGradientByClasses(classes: string): GradientPreset | undefined {
  return GRADIENT_PRESETS.find((g) => g.classes === classes);
}

export function findGradientById(id: string): GradientPreset | undefined {
  return GRADIENT_PRESETS.find((g) => g.id === id);
}

export const NEWS_CATEGORY_PRESETS = [
  "Atualização",
  "Evento",
  "Conteúdo",
  "Ranking",
  "Promoção",
  "Anticheat",
  "Patch",
  "Comunidade",
  "Torneio",
  "Manutenção",
] as const;

export const CS_MAP_PRESETS = [
  { id: "de_mirage", label: "Mirage", group: "Competitivo" },
  { id: "de_inferno", label: "Inferno", group: "Competitivo" },
  { id: "de_dust2", label: "Dust II", group: "Competitivo" },
  { id: "de_nuke", label: "Nuke", group: "Competitivo" },
  { id: "de_ancient", label: "Ancient", group: "Competitivo" },
  { id: "de_anubis", label: "Anubis", group: "Competitivo" },
  { id: "de_vertigo", label: "Vertigo", group: "Competitivo" },
  { id: "de_overpass", label: "Overpass", group: "Competitivo" },
  { id: "awp_lego", label: "AWP Lego", group: "ForFun" },
  { id: "surf_utopia", label: "Surf Utopia", group: "ForFun" },
  { id: "cs_office", label: "Office", group: "Casual" },
  { id: "cs_italy", label: "Italy", group: "Casual" },
] as const;

export const STORE_TYPE_PRESETS = [
  "Skin Collection",
  "Agente",
  "Cosmético",
  "Pacote",
  "Tag",
  "Faca",
  "Luvas",
  "Rifle",
] as const;

export const STORE_BADGE_PRESETS = [
  "Novo",
  "Em alta",
  "Popular",
  "Limitado",
  "-30%",
  "-50%",
  "Exclusivo",
  "Premium",
] as const;

export const SERVER_MODE_PRESETS = [
  "Retakes",
  "Deathmatch",
  "ForFun",
  "Duels",
  "Wingman",
  "Competitivo",
  "AWP",
  "Pistols",
  "Surf",
] as const;

export const ICON_PRESETS = [
  { key: "Crosshair", label: "Mira" },
  { key: "Swords", label: "Espadas" },
  { key: "PartyPopper", label: "Festa" },
  { key: "Footprints", label: "Movimentação" },
  { key: "Server", label: "Servidor" },
  { key: "Trophy", label: "Troféu" },
  { key: "Package", label: "Pacote" },
  { key: "UserRound", label: "Usuário" },
  { key: "Zap", label: "Energia" },
  { key: "Crown", label: "Coroa" },
  { key: "Gamepad2", label: "Gamepad" },
  { key: "Shield", label: "Escudo" },
  { key: "Target", label: "Alvo" },
  { key: "Flame", label: "Fogo" },
  { key: "Star", label: "Estrela" },
  { key: "Bolt", label: "Raio" },
] as const;

export type IconPresetKey = typeof ICON_PRESETS[number]["key"];
