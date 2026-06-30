export type ProfileBackgroundPreset = {
  id: string;
  labelKey: string;
  previewClass: string;
};

export type ProfileFrameOverlayLayout = "cover" | "wrap" | "corner";

export type ProfileFrameOverlayCorner =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export type ProfileFrameOverlayBlendMode =
  | "screen"
  | "lighten"
  | "multiply"
  | "normal";

export type ProfileFramePreset = {
  id: string;
  labelKey: string;
  ringClass: string;
  glowClass?: string;
  glowShadow?: string;
  previewBorderColor: string;
  previewGlow?: string;
  adminOnly?: boolean;
  isRainbow?: boolean;
  /** Public URL for image/GIF overlay frame (stars, ornaments, etc.). */
  overlayAsset?: string;
  /** cover = overlay on top; wrap = moldura around the avatar; corner = decal in a corner. */
  overlayLayout?: ProfileFrameOverlayLayout;
  /** Inner window width as a fraction of the frame asset (wrap layout only). */
  overlayHoleRatio?: number;
  /** Corner anchor for corner layout. */
  overlayCorner?: ProfileFrameOverlayCorner;
  /** Decal size as a fraction of avatar width/height (corner layout only). */
  overlayCornerScale?: number;
  overlayBlendMode?: ProfileFrameOverlayBlendMode;
};

export type ProfileThemePreset = {
  id: string;
  labelKey: string;
  heroGradient: string;
  glowColor: string;
};

export type ProfileBorderPreset = {
  id: string;
  labelKey: string;
  cardClass: string;
  avatarBorderClass: string;
  avatarGlowClass?: string;
  avatarGlowShadow?: string;
  previewBorderColor: string;
  previewGlow?: string;
};

export const ADMIN_RAINBOW_FRAME_ID = "admin-rainbow";

export const AVATAR_SIZE_PX = {
  xs: 28,
  sm: 32,
  md: 44,
  lg: 112,
  xl: 128,
} as const;

export type AvatarFrameSize = keyof typeof AVATAR_SIZE_PX;

export const DEFAULT_OVERLAY_HOLE_RATIO = 0.56;

export const DEFAULT_OVERLAY_CORNER: ProfileFrameOverlayCorner = "bottom-left";

export const DEFAULT_OVERLAY_CORNER_SCALE = 0.55;

export function resolveWrapFrameOuterPx(
  size: AvatarFrameSize,
  holeRatio = DEFAULT_OVERLAY_HOLE_RATIO,
): number {
  return Math.round(AVATAR_SIZE_PX[size] / holeRatio);
}

export const PROFILE_BACKGROUNDS: ProfileBackgroundPreset[] = [
  { id: "default", labelKey: "bgDefault", previewClass: "bg-[linear-gradient(135deg,#1a1a2e,#16213e)]" },
  { id: "neon-grid", labelKey: "bgNeonGrid", previewClass: "bg-[linear-gradient(135deg,#0f0c29,#302b63,#24243e)]" },
  { id: "smoke", labelKey: "bgSmoke", previewClass: "bg-[linear-gradient(160deg,#1c1c1c,#3d3d3d,#1a1a1a)]" },
  { id: "csgo-map", labelKey: "bgCsgo", previewClass: "bg-[linear-gradient(135deg,#2d4a22,#1a3320,#0d1f12)]" },
  { id: "aurora", labelKey: "bgAurora", previewClass: "bg-[linear-gradient(135deg,#0f2027,#203a43,#2c5364)]" },
  { id: "midnight", labelKey: "bgMidnight", previewClass: "bg-[linear-gradient(135deg,#000428,#004e92)]" },
  { id: "crimson", labelKey: "bgCrimson", previewClass: "bg-[linear-gradient(135deg,#200122,#6f0000)]" },
];

export const PROFILE_FRAMES: ProfileFramePreset[] = [
  {
    id: "none",
    labelKey: "frameNone",
    ringClass: "border border-[color-mix(in_srgb,var(--primary)_35%,var(--border))]",
    previewBorderColor: "color-mix(in srgb, var(--primary) 35%, var(--border))",
  },
  {
    id: "gold",
    labelKey: "frameGold",
    ringClass: "border-2 border-amber-400",
    glowClass: "shadow-[0_0_14px_rgba(251,191,36,0.35)]",
    glowShadow: "0 0 14px rgba(251,191,36,0.35)",
    previewBorderColor: "#fbbf24",
    previewGlow: "0 0 12px rgba(251,191,36,0.45)",
  },
  {
    id: "diamond",
    labelKey: "frameDiamond",
    ringClass: "border-2 border-cyan-300",
    glowClass: "shadow-[0_0_14px_rgba(103,232,249,0.3)]",
    glowShadow: "0 0 14px rgba(103,232,249,0.3)",
    previewBorderColor: "#67e8f9",
    previewGlow: "0 0 12px rgba(103,232,249,0.4)",
  },
  {
    id: "neon",
    labelKey: "frameNeon",
    ringClass: "border-2 border-primary",
    glowClass: "shadow-[0_0_16px_var(--glow-1)]",
    glowShadow: "0 0 16px var(--glow-1)",
    previewBorderColor: "var(--primary)",
    previewGlow: "0 0 12px var(--glow-1)",
  },
  {
    id: "elite-crown",
    labelKey: "frameElite",
    ringClass: "border-2 border-amber-500",
    glowClass: "shadow-[0_0_16px_rgba(245,158,11,0.4)]",
    glowShadow: "0 0 16px rgba(245,158,11,0.4)",
    previewBorderColor: "#f59e0b",
    previewGlow: "0 0 12px rgba(245,158,11,0.45)",
  },
  {
    id: "cyber",
    labelKey: "frameCyber",
    ringClass: "border-2 border-violet-400",
    glowClass: "shadow-[0_0_14px_rgba(167,139,250,0.35)]",
    glowShadow: "0 0 14px rgba(167,139,250,0.35)",
    previewBorderColor: "#a78bfa",
    previewGlow: "0 0 12px rgba(167,139,250,0.4)",
  },
  {
    id: "stars-rose",
    labelKey: "frameStarsRose",
    ringClass: "",
    previewBorderColor: "#f472b6",
    overlayAsset: "/framers/framerStarsRose-ezgif.com-gif-maker.gif",
    overlayLayout: "cover",
    overlayBlendMode: "screen",
  },
  {
    id: "dragon-green",
    labelKey: "frameDragonGreen",
    ringClass: "",
    previewBorderColor: "#22c55e",
    overlayAsset: "/framers/dragonGreenBorder.jpg",
    overlayLayout: "wrap",
    overlayHoleRatio: DEFAULT_OVERLAY_HOLE_RATIO,
    overlayBlendMode: "multiply",
  },
  {
    id: "dragon-red",
    labelKey: "frameDragonRed",
    ringClass: "",
    previewBorderColor: "#ef4444",
    overlayAsset: "/framers/dragonRedBorder.jpg",
    overlayLayout: "wrap",
    overlayHoleRatio: DEFAULT_OVERLAY_HOLE_RATIO,
    overlayBlendMode: "multiply",
  },
  {
    id: "dragon",
    labelKey: "frameDragon",
    ringClass: "",
    previewBorderColor: "#22d3ee",
    overlayAsset: "/framers/dragon.gif",
    overlayLayout: "corner",
    overlayCorner: DEFAULT_OVERLAY_CORNER,
    overlayCornerScale: DEFAULT_OVERLAY_CORNER_SCALE,
    overlayBlendMode: "screen",
  },
  {
    id: ADMIN_RAINBOW_FRAME_ID,
    labelKey: "frameAdminRainbow",
    ringClass: "",
    previewBorderColor: "transparent",
    adminOnly: true,
    isRainbow: true,
  },
];

export const PROFILE_THEMES: ProfileThemePreset[] = [
  {
    id: "default",
    labelKey: "themeDefault",
    heroGradient: "linear-gradient(135deg, color-mix(in srgb, var(--primary) 18%, transparent), transparent)",
    glowColor: "var(--glow-1)",
  },
  {
    id: "aurora",
    labelKey: "themeAurora",
    heroGradient: "linear-gradient(135deg, rgba(56,189,248,0.15), rgba(167,139,250,0.12), transparent)",
    glowColor: "rgba(56,189,248,0.45)",
  },
  {
    id: "neon",
    labelKey: "themeNeon",
    heroGradient: "linear-gradient(135deg, rgba(var(--primary-rgb,99,102,241),0.2), transparent)",
    glowColor: "var(--glow-1)",
  },
  {
    id: "minimal",
    labelKey: "themeMinimal",
    heroGradient: "linear-gradient(180deg, rgba(255,255,255,0.04), transparent)",
    glowColor: "rgba(255,255,255,0.08)",
  },
  {
    id: "crimson",
    labelKey: "themeCrimson",
    heroGradient: "linear-gradient(135deg, rgba(239,68,68,0.18), rgba(127,29,29,0.08), transparent)",
    glowColor: "rgba(239,68,68,0.35)",
  },
];

export const PROFILE_BORDERS: ProfileBorderPreset[] = [
  {
    id: "none",
    labelKey: "borderNone",
    cardClass: "",
    avatarBorderClass: "border border-border/50",
    previewBorderColor: "var(--border)",
  },
  {
    id: "solid-primary",
    labelKey: "borderPrimary",
    cardClass: "ring-1 ring-primary/40",
    avatarBorderClass: "border-2 border-primary/50",
    previewBorderColor: "var(--primary)",
    previewGlow: "0 0 0 1px color-mix(in srgb, var(--primary) 40%, transparent)",
  },
  {
    id: "glow-gold",
    labelKey: "borderGold",
    cardClass: "ring-1 ring-amber-400/50 shadow-[0_0_20px_rgba(251,191,36,0.15)]",
    avatarBorderClass: "border-2 border-amber-400/90",
    avatarGlowClass: "shadow-[0_0_12px_rgba(251,191,36,0.35)]",
    avatarGlowShadow: "0 0 12px rgba(251,191,36,0.35)",
    previewBorderColor: "#fbbf24",
    previewGlow: "0 0 14px rgba(251,191,36,0.35)",
  },
  {
    id: "pulse-violet",
    labelKey: "borderViolet",
    cardClass: "ring-1 ring-violet-400/45",
    avatarBorderClass: "border-2 border-violet-400/80",
    avatarGlowClass: "shadow-[0_0_12px_rgba(167,139,250,0.3)]",
    avatarGlowShadow: "0 0 12px rgba(167,139,250,0.3)",
    previewBorderColor: "#a78bfa",
    previewGlow: "0 0 14px rgba(167,139,250,0.35)",
  },
  {
    id: "double-line",
    labelKey: "borderDouble",
    cardClass: "ring-2 ring-[color-mix(in_srgb,var(--primary)_25%,transparent)] ring-offset-2 ring-offset-background",
    avatarBorderClass: "border-2 border-[color-mix(in_srgb,var(--primary)_45%,var(--border))]",
    previewBorderColor: "color-mix(in srgb, var(--primary) 45%, var(--border))",
    previewGlow: "0 0 0 2px color-mix(in srgb, var(--primary) 25%, transparent)",
  },
];

export const PROFILE_CUSTOMIZATION_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#c026d3",
  "#ec4899",
  "#f43f5e",
  "#e11d48",
  "#f97316",
  "#ea580c",
  "#eab308",
  "#ca8a04",
  "#84cc16",
  "#22c55e",
  "#16a34a",
  "#14b8a6",
  "#0d9488",
  "#06b6d4",
  "#0284c7",
  "#3b82f6",
  "#2563eb",
  "#1d4ed8",
  "#64748b",
  "#475569",
  "#fbbf24",
  "#ffffff",
  "#0f172a",
] as const;

/** @deprecated use PROFILE_CUSTOMIZATION_COLORS */
export const PROFILE_ACCENT_COLORS = PROFILE_CUSTOMIZATION_COLORS;

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const backgroundIds = new Set(PROFILE_BACKGROUNDS.map((row) => row.id));
const frameIds = new Set(PROFILE_FRAMES.map((row) => row.id));
const themeIds = new Set(PROFILE_THEMES.map((row) => row.id));
const borderIds = new Set(PROFILE_BORDERS.map((row) => row.id));

export function isValidBackgroundId(id: string): boolean {
  return backgroundIds.has(id);
}

export function isValidFrameId(id: string, options?: { isAdmin?: boolean }): boolean {
  if (!frameIds.has(id)) return false;
  if (id === ADMIN_RAINBOW_FRAME_ID) return options?.isAdmin === true;
  return true;
}

export function isValidThemeId(id: string): boolean {
  return themeIds.has(id);
}

export function isValidBorderId(id: string): boolean {
  return borderIds.has(id);
}

export function isValidProfileColor(color: string | null | undefined): boolean {
  if (!color) return true;
  if (HEX_COLOR.test(color)) return true;
  return PROFILE_CUSTOMIZATION_COLORS.includes(
    color as (typeof PROFILE_CUSTOMIZATION_COLORS)[number],
  );
}

/** @deprecated use isValidProfileColor */
export const isValidAccentColor = isValidProfileColor;

export function normalizeProfileColor(color: string): string | null {
  const trimmed = color.trim();
  if (!trimmed) return null;
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return isValidProfileColor(withHash) ? withHash.toLowerCase() : null;
}

/** @deprecated use normalizeProfileColor */
export const normalizeAccentColor = normalizeProfileColor;

export function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.startsWith("#") ? hex : `#${hex}`;
  const r = Number.parseInt(normalized.slice(1, 3), 16);
  const g = Number.parseInt(normalized.slice(3, 5), 16);
  const b = Number.parseInt(normalized.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function resolveEffectiveFrameId(frameId: string, isAdmin: boolean): string {
  if (frameId === ADMIN_RAINBOW_FRAME_ID && !isAdmin) return "none";
  return frameId;
}

export function isOverlayFrameId(frameId: string): boolean {
  return Boolean(getFramePreset(frameId).overlayAsset);
}

export function resolveAvatarBorderStyles(
  frameId: string,
  borderId: string,
  options?: { frameColor?: string | null; borderColor?: string | null; isAdmin?: boolean },
): {
  ringClass: string;
  glowClass: string | null;
  glowShadow: string | null;
  isRainbow: boolean;
  frameOverlayUrl: string | null;
  frameOverlayLayout: ProfileFrameOverlayLayout;
  frameOverlayHoleRatio: number | null;
  frameOverlayCorner: ProfileFrameOverlayCorner | null;
  frameOverlayCornerScale: number | null;
  frameOverlayBlendMode: ProfileFrameOverlayBlendMode;
  useCustomFrameColor: boolean;
  useCustomBorderColor: boolean;
} {
  const effectiveFrameId = resolveEffectiveFrameId(frameId, options?.isAdmin ?? false);
  const frame = getFramePreset(effectiveFrameId);
  const border = getBorderPreset(borderId);

  if (frame.overlayAsset) {
    return {
      ringClass: "",
      glowClass: null,
      glowShadow: null,
      isRainbow: false,
      frameOverlayUrl: frame.overlayAsset,
      frameOverlayLayout: frame.overlayLayout ?? "cover",
      frameOverlayHoleRatio: frame.overlayHoleRatio ?? null,
      frameOverlayCorner: frame.overlayCorner ?? null,
      frameOverlayCornerScale: frame.overlayCornerScale ?? null,
      frameOverlayBlendMode: frame.overlayBlendMode ?? "screen",
      useCustomFrameColor: false,
      useCustomBorderColor: false,
    };
  }

  if (frame.isRainbow) {
    return {
      ringClass: "",
      glowClass: null,
      glowShadow: null,
      isRainbow: true,
      frameOverlayUrl: null,
      frameOverlayLayout: "cover",
      frameOverlayHoleRatio: null,
      frameOverlayCorner: null,
      frameOverlayCornerScale: null,
      frameOverlayBlendMode: "normal",
      useCustomFrameColor: false,
      useCustomBorderColor: false,
    };
  }

  if (effectiveFrameId !== "none") {
    return {
      ringClass: options?.frameColor ? "border-2 profile-frame-custom" : frame.ringClass,
      glowClass: options?.frameColor ? null : (frame.glowClass ?? null),
      glowShadow: options?.frameColor ? null : (frame.glowShadow ?? null),
      isRainbow: false,
      frameOverlayUrl: null,
      frameOverlayLayout: "cover",
      frameOverlayHoleRatio: null,
      frameOverlayCorner: null,
      frameOverlayCornerScale: null,
      frameOverlayBlendMode: "normal",
      useCustomFrameColor: Boolean(options?.frameColor),
      useCustomBorderColor: false,
    };
  }

  return {
    ringClass: options?.borderColor
      ? "border-2 profile-frame-custom"
      : border.avatarBorderClass,
    glowClass: options?.borderColor ? null : (border.avatarGlowClass ?? null),
    glowShadow: options?.borderColor ? null : (border.avatarGlowShadow ?? null),
    isRainbow: false,
    frameOverlayUrl: null,
    frameOverlayLayout: "cover",
    frameOverlayHoleRatio: null,
    frameOverlayCorner: null,
    frameOverlayCornerScale: null,
    frameOverlayBlendMode: "normal",
    useCustomFrameColor: false,
    useCustomBorderColor: Boolean(options?.borderColor),
  };
}

export function resolveThemeStyles(
  themeId: string,
  themeColor: string | null | undefined,
): { heroGradient: string; glowColor: string; useCustomThemeColor: boolean } {
  const theme = getThemePreset(themeId);
  if (!themeColor) {
    return {
      heroGradient: theme.heroGradient,
      glowColor: theme.glowColor,
      useCustomThemeColor: false,
    };
  }

  return {
    heroGradient: `linear-gradient(135deg, ${hexToRgba(themeColor, 0.2)}, ${hexToRgba(themeColor, 0.06)}, transparent)`,
    glowColor: hexToRgba(themeColor, 0.45),
    useCustomThemeColor: true,
  };
}

export function resolveBorderCardClass(
  borderId: string,
  borderColor: string | null | undefined,
): { cardClass: string; useCustomBorderColor: boolean } {
  const border = getBorderPreset(borderId);
  if (!borderColor || borderId === "none") {
    return { cardClass: border.cardClass, useCustomBorderColor: false };
  }

  const baseClass =
    borderId === "double-line"
      ? "ring-2 ring-offset-2 ring-offset-background profile-border-custom"
      : borderId === "glow-gold"
        ? "ring-1 profile-border-custom profile-border-custom-glow"
        : "ring-1 profile-border-custom";

  return { cardClass: baseClass, useCustomBorderColor: true };
}

export function resolveBackgroundStyles(
  backgroundId: string,
  backgroundColor: string | null | undefined,
): { backgroundClass: string; useCustomBackgroundColor: boolean } {
  const background = getBackgroundPreset(backgroundId);
  return {
    backgroundClass: background.previewClass,
    useCustomBackgroundColor: Boolean(backgroundColor),
  };
}

export function getBackgroundPreset(id: string): ProfileBackgroundPreset {
  return PROFILE_BACKGROUNDS.find((row) => row.id === id) ?? PROFILE_BACKGROUNDS[0];
}

export function getFramePreset(id: string): ProfileFramePreset {
  return PROFILE_FRAMES.find((row) => row.id === id) ?? PROFILE_FRAMES[0];
}

export function getThemePreset(id: string): ProfileThemePreset {
  return PROFILE_THEMES.find((row) => row.id === id) ?? PROFILE_THEMES[0];
}

export function getBorderPreset(id: string): ProfileBorderPreset {
  return PROFILE_BORDERS.find((row) => row.id === id) ?? PROFILE_BORDERS[0];
}

export type ProfileCustomizationState = {
  profileBannerUrl: string | null;
  profileBannerMediaType: "STATIC" | "GIF";
  profileBannerModerationStatus: "APPROVED" | "PENDING" | "REJECTED";
  profileBackgroundId: string;
  profileBackgroundColor: string | null;
  profileFrameId: string;
  profileFrameColor: string | null;
  profileAccentColor: string | null;
  profileThemeId: string;
  profileThemeColor: string | null;
  profileBorderId: string;
  profileBorderColor: string | null;
  profileShowPlanBadge: boolean;
  profileShowAchievements: boolean;
  avatarMediaType: "STATIC" | "GIF";
  avatarModerationStatus: "APPROVED" | "PENDING" | "REJECTED";
};

export type ResolvedProfileStyleVars = {
  "--profile-frame-color"?: string;
  "--profile-border-color"?: string;
  "--profile-theme-color"?: string;
  "--profile-bg-color"?: string;
  "--profile-accent"?: string;
};

export function buildProfileStyleVars(
  fields: ProfileCustomizationState,
): ResolvedProfileStyleVars {
  const vars: ResolvedProfileStyleVars = {};
  if (fields.profileFrameColor) vars["--profile-frame-color"] = fields.profileFrameColor;
  if (fields.profileBorderColor) vars["--profile-border-color"] = fields.profileBorderColor;
  if (fields.profileThemeColor) vars["--profile-theme-color"] = fields.profileThemeColor;
  if (fields.profileBackgroundColor) vars["--profile-bg-color"] = fields.profileBackgroundColor;
  if (fields.profileAccentColor) vars["--profile-accent"] = fields.profileAccentColor;
  return vars;
}
