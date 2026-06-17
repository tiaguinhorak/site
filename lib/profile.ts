import { countries } from "@/lib/profile/countries";

export const profileCountries = countries.map((c) => ({
  value: c.code,
  label: `${c.flag} ${c.name}`,
}));

export { countries, getCountryFlag, getCountryLabel, getCountry } from "@/lib/profile/countries";

export function getAvatarInitials(
  firstName: string,
  lastName: string,
  nickname: string,
) {
  const fromName = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  if (fromName.trim().length === 2) return fromName;
  return nickname.slice(0, 2).toUpperCase();
}

export type InventoryCategoryKey =
  | "knife"
  | "gloves"
  | "rifle"
  | "pistol"
  | "smg"
  | "agent";

export const inventoryCategoryLabels: Record<InventoryCategoryKey, string> = {
  knife: "Facas",
  gloves: "Luvas",
  rifle: "Rifles",
  pistol: "Pistolas",
  smg: "SMGs",
  agent: "Agentes",
};

export function inventoryCategoryFromDb(
  category: string,
): InventoryCategoryKey {
  const map: Record<string, InventoryCategoryKey> = {
    KNIFE: "knife",
    GLOVES: "gloves",
    RIFLE: "rifle",
    PISTOL: "pistol",
    SMG: "smg",
    AGENT: "agent",
  };
  return map[category] ?? "rifle";
}

export function inventoryRarityFromDb(rarity: string): string {
  const map: Record<string, string> = {
    COMUM: "comum",
    RARO: "raro",
    EPICO: "épico",
    LENDARIO: "lendário",
    MITICO: "mítico",
  };
  return map[rarity] ?? "comum";
}

export const skinNames = [
  "Dragon Lore",
  "Howl",
  "Gungnir",
  "Inheritance",
  "Gamma Doppler",
  "Case Hardened",
  "The Oligarch",
  "Crane Flight",
  "Searing Rage",
  "The Outsiders",
  "Asiimov",
  "Fade",
];
