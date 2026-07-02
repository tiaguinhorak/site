export const PLAN_COMPARISON_ROW_IDS = [
  "publicServers",
  "profileRanking",
  "rankedQueue",
  "lobbyRooms",
  "serverPriority",
  "expandedSkins",
  "agents",
  "stickers",
  "profileTag",
  "battlePassPremium",
  "profileCustomization",
  "createClan",
  "discordRoles",
  "advancedStats",
] as const;

export type PlanComparisonRowId = (typeof PLAN_COMPARISON_ROW_IDS)[number];

export type PlanComparisonCell = "yes" | "no" | "text";

export type PlanComparisonRow = {
  id: PlanComparisonRowId;
  free: PlanComparisonCell;
  premium: PlanComparisonCell;
  elite: PlanComparisonCell;
};

export const PLAN_COMPARISON_ROWS: PlanComparisonRow[] = [
  { id: "publicServers", free: "yes", premium: "yes", elite: "yes" },
  { id: "profileRanking", free: "yes", premium: "yes", elite: "yes" },
  { id: "rankedQueue", free: "no", premium: "yes", elite: "yes" },
  { id: "lobbyRooms", free: "no", premium: "yes", elite: "yes" },
  { id: "serverPriority", free: "no", premium: "yes", elite: "yes" },
  { id: "expandedSkins", free: "no", premium: "yes", elite: "yes" },
  { id: "agents", free: "no", premium: "yes", elite: "yes" },
  { id: "stickers", free: "text", premium: "text", elite: "text" },
  { id: "profileTag", free: "no", premium: "yes", elite: "yes" },
  { id: "battlePassPremium", free: "no", premium: "yes", elite: "yes" },
  { id: "profileCustomization", free: "no", premium: "no", elite: "yes" },
  { id: "createClan", free: "no", premium: "no", elite: "yes" },
  { id: "discordRoles", free: "no", premium: "yes", elite: "yes" },
  { id: "advancedStats", free: "no", premium: "no", elite: "yes" },
];
