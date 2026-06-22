export type AvatarPreset = {
  id: string;
  /** Fallback label (i18n: avatar.presetLabels.{id}) */
  label: string;
  /** Tailwind gradient for loading shimmer / legacy fallback */
  gradient: string;
};

export const avatarPresets: AvatarPreset[] = [
  { id: "viper", label: "Clutch Purple", gradient: "from-violet-600 to-fuchsia-500" },
  { id: "ember", label: "Clutch Ember", gradient: "from-orange-500 to-violet-700" },
  { id: "frost", label: "Clutch Frost", gradient: "from-cyan-400 to-indigo-600" },
  { id: "neon", label: "Clutch Neon", gradient: "from-emerald-400 to-teal-600" },
  { id: "gold", label: "Clutch Gold", gradient: "from-amber-400 to-violet-600" },
  { id: "shadow", label: "Clutch Shadow", gradient: "from-zinc-600 to-violet-900" },
  { id: "crimson", label: "Clutch Crimson", gradient: "from-rose-500 to-violet-800" },
  { id: "aurora", label: "Clutch Aurora", gradient: "from-pink-500 via-violet-500 to-indigo-600" },
  { id: "toxic", label: "Clutch Toxic", gradient: "from-lime-400 to-violet-700" },
  { id: "royal", label: "Clutch Royal", gradient: "from-blue-500 to-violet-900" },
];

export const avatarPresetIds = avatarPresets.map((p) => p.id);

export const DEFAULT_AVATAR_PRESET = "viper";

export function getAvatarPreset(id: string): AvatarPreset | undefined {
  return avatarPresets.find((p) => p.id === id);
}

export function avatarPresetUrl(id: string): string {
  return `/avatars/presets/${id}.svg`;
}
