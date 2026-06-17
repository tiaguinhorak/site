export type AvatarPreset = {
  id: string;
  label: string;
  /** Tailwind gradient classes for picker preview */
  gradient: string;
};

export const avatarPresets: AvatarPreset[] = [
  { id: "viper", label: "Viper", gradient: "from-violet-600 to-fuchsia-500" },
  { id: "ember", label: "Ember", gradient: "from-orange-500 to-rose-600" },
  { id: "frost", label: "Frost", gradient: "from-cyan-400 to-blue-600" },
  { id: "neon", label: "Neon", gradient: "from-emerald-400 to-teal-600" },
  { id: "gold", label: "Gold", gradient: "from-amber-400 to-yellow-600" },
  { id: "shadow", label: "Shadow", gradient: "from-zinc-600 to-zinc-900" },
  { id: "crimson", label: "Crimson", gradient: "from-rose-600 to-red-900" },
  { id: "aurora", label: "Aurora", gradient: "from-indigo-500 via-purple-500 to-pink-500" },
  { id: "toxic", label: "Toxic", gradient: "from-lime-400 to-green-700" },
  { id: "royal", label: "Royal", gradient: "from-blue-600 to-indigo-900" },
];

export const avatarPresetIds = avatarPresets.map((p) => p.id);

export function getAvatarPreset(id: string): AvatarPreset | undefined {
  return avatarPresets.find((p) => p.id === id);
}

export function avatarPresetUrl(id: string): string {
  return `/avatars/presets/${id}.svg`;
}
