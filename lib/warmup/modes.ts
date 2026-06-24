export type WarmupModeId =
  | "arena_1x1"
  | "deathmatch"
  | "multimod"
  | "rifle"
  | "pistol"
  | "headshot"
  | "retake"
  | "surf"
  | "casual"
  | "kz";

export type WarmupModeDef = {
  id: WarmupModeId;
  label: string;
  /** Matches PublicServer.mode (case-insensitive) */
  modeLabel: string;
  icon: string;
  accent: string;
};

export const WARMUP_MODES: WarmupModeDef[] = [
  {
    id: "arena_1x1",
    label: "Nova Arena 1x1",
    modeLabel: "Nova Arena 1x1",
    icon: "Boxes",
    accent: "from-violet-600 to-purple-800",
  },
  {
    id: "deathmatch",
    label: "Deathmatch",
    modeLabel: "Deathmatch",
    icon: "Skull",
    accent: "from-rose-600 to-red-800",
  },
  {
    id: "multimod",
    label: "Multimod",
    modeLabel: "Multimod",
    icon: "Gamepad2",
    accent: "from-indigo-600 to-blue-800",
  },
  {
    id: "rifle",
    label: "Rifle",
    modeLabel: "Rifle",
    icon: "Crosshair",
    accent: "from-amber-600 to-orange-800",
  },
  {
    id: "pistol",
    label: "Pistol",
    modeLabel: "Pistol",
    icon: "Target",
    accent: "from-cyan-600 to-teal-800",
  },
  {
    id: "headshot",
    label: "Headshot",
    modeLabel: "Headshot",
    icon: "ScanFace",
    accent: "from-fuchsia-600 to-pink-800",
  },
  {
    id: "retake",
    label: "Retake",
    modeLabel: "Retake",
    icon: "Bomb",
    accent: "from-emerald-600 to-green-800",
  },
  {
    id: "surf",
    label: "Surf",
    modeLabel: "Surf",
    icon: "Waves",
    accent: "from-sky-600 to-blue-900",
  },
  {
    id: "casual",
    label: "Casual",
    modeLabel: "Casual",
    icon: "Users",
    accent: "from-slate-600 to-zinc-800",
  },
  {
    id: "kz",
    label: "KZ",
    modeLabel: "KZ",
    icon: "Mountain",
    accent: "from-lime-600 to-emerald-900",
  },
];

export function normalizeModeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function serverMatchesWarmupMode(
  serverMode: string,
  mode: WarmupModeDef,
): boolean {
  const key = normalizeModeKey(serverMode);
  const target = normalizeModeKey(mode.modeLabel);
  if (key === target) return true;
  if (key === normalizeModeKey(mode.label)) return true;
  if (mode.id === "deathmatch" && key.includes("deathmatch")) return true;
  if (mode.id === "retake" && key.includes("retake")) return true;
  if (mode.id === "surf" && key.includes("surf")) return true;
  if (mode.id === "kz" && (key === "kz" || key.includes("climb"))) return true;
  return false;
}

export function findWarmupModeForServerMode(mode: string): WarmupModeDef | undefined {
  return WARMUP_MODES.find((entry) => serverMatchesWarmupMode(mode, entry));
}
