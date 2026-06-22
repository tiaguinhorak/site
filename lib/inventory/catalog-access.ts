import "server-only";

export function isAllSkinsEquipEnabled(): boolean {
  const flags = [
    process.env.INVENTORY_ALL_SKINS,
    process.env.INVENTORY_DEMO_OWN_ALL,
  ];
  return flags.some((flag) => {
    const value = flag?.trim().toLowerCase();
    return value === "1" || value === "true" || value === "yes";
  });
}
