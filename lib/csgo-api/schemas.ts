import { z } from "zod";

export const DEFAULT_MAP_POOL = [
  "de_mirage",
  "de_inferno",
  "de_dust2",
  "de_nuke",
  "de_overpass",
  "de_ancient",
  "de_anubis",
] as const;

export const matchPlayerSchema = z.object({
  steamId: z.string().min(1),
  name: z.string().min(1).max(64),
});

export const matchTeamSchema = z.object({
  name: z.string().min(1).max(64),
  players: z.array(matchPlayerSchema).min(1).max(5),
});

export const matchConfigSchema = z.object({
  gameType: z.number().int().default(0),
  gameMode: z.number().int().default(1),
  tickrate: z.number().int().min(64).max(128).default(128),
  maxRounds: z.number().int().min(1).max(30).default(24),
  overtimeRounds: z.number().int().min(1).max(10).default(6),
  knifeRound: z.boolean().optional(),
});

export const createMatchSchema = z.object({
  roomId: z.string().min(1).max(128),
  teamA: matchTeamSchema,
  teamB: matchTeamSchema,
  mapPool: z.array(z.string().min(1)).min(1).optional(),
  config: matchConfigSchema.optional(),
});

export const matchStatusSchema = z.enum([
  "waiting_players",
  "veto",
  "ready",
  "live",
  "finished",
  "cancelled",
]);

export const serverStatusSchema = z.enum(["online", "offline", "busy"]);

export const createServerSchema = z.object({
  name: z.string().min(1).max(80),
  host: z.string().min(1),
  sshUser: z.string().min(1).optional(),
  sshPassword: z.string().min(1).optional(),
  rconPort: z.number().int().min(1).max(65535),
  rconPassword: z.string().min(1),
  csgoDir: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  tickrate: z.number().int().min(64).max(128).default(128),
});

export const serverStartSchema = z.object({
  map: z.string().min(1).optional(),
  password: z.string().optional(),
});

export const rconCommandSchema = z.object({
  command: z.string().min(1).max(512),
});

export const vetoActionSchema = z.object({
  team: z.enum(["A", "B"]),
  action: z.enum(["ban", "pick"]),
  map: z.string().min(1),
});

export const matchStartSchema = z.object({
  serverId: z.string().uuid().optional(),
});

export const skinWearSchema = z.enum([
  "factory_new",
  "minimal_wear",
  "field_tested",
  "well_worn",
  "battle_scarred",
]);

export const createSkinCatalogSchema = z.object({
  id: z.string().min(1).max(64),
  weaponId: z.string().min(1).max(64),
  weaponName: z.string().min(1).max(64),
  paintkit: z.number().int().positive(),
  paintkitName: z.string().min(1).max(64),
  rarity: z.string().min(1).max(32),
  category: z.string().min(1).max(32),
});

export const giveSkinSchema = z.object({
  skinId: z.string().min(1),
  wear: skinWearSchema.default("factory_new"),
  seed: z.number().int().min(0).max(1000).default(0),
  stattrak: z.boolean().default(false),
  nametag: z.string().max(32).optional(),
});

export const equipSkinSchema = z.object({
  playerSkinId: z.string().min(1),
});

export const unequipSkinSchema = z.object({
  weaponId: z.string().min(1),
});

export type MatchTeam = z.infer<typeof matchTeamSchema>;
export type MatchConfig = z.infer<typeof matchConfigSchema>;
export type VetoHistoryEntry = {
  team: "A" | "B";
  action: "ban" | "pick";
  map: string;
  timestamp: string;
};
export type PickedMaps = { map1?: string; map2?: string };
