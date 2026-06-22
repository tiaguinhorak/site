import { z } from "zod";
import { sanitizeText } from "@/lib/security/sanitize";

export const LOBBY_SLOT_OPTIONS = [2, 5, 10, 16] as const;
export const LOBBY_REGION_OPTIONS = ["BR", "AR", "UY", "CL", "CO", "PE"] as const;
export const LOBBY_WEAPON_OPTIONS = ["all", "pistols", "smg", "rifles", "snipers"] as const;

export const lobbySettingsSchema = z.object({
  tickrate: z.union([z.literal(64), z.literal(128)]).default(128),
  friendlyFire: z.boolean().default(false),
  weapons: z.enum(LOBBY_WEAPON_OPTIONS).default("all"),
  overtime: z.boolean().default(true),
  knifeRound: z.boolean().default(false),
  autoKick: z.boolean().default(true),
  voiceRequired: z.boolean().default(false),
  allowSpectators: z.boolean().default(true),
  minLevel: z.number().int().min(1).max(20).default(1),
  maxLevel: z.number().int().min(1).max(20).default(20),
  warmupSeconds: z.number().int().min(0).max(300).default(60),
  description: z
    .string()
    .max(200)
    .default("")
    .transform((v) => sanitizeText(v, 200)),
});

export const createLobbyRoomSchema = z.object({
  gameModeId: z.string().min(1),
  name: z
    .string()
    .min(3, "Nome muito curto.")
    .max(48)
    .transform((v) => sanitizeText(v, 48)),
  map: z.string().min(2).max(64).transform((v) => sanitizeText(v, 64)),
  slots: z.number().int().refine((v) => (LOBBY_SLOT_OPTIONS as readonly number[]).includes(v), {
    message: "Número de slots inválido.",
  }),
  region: z.enum(LOBBY_REGION_OPTIONS).default("BR"),
  visibility: z.enum(["public", "private"]).default("public"),
  password: z.string().min(4).max(32).optional(),
  settings: lobbySettingsSchema.optional(),
});

export const updateLobbyRoomSchema = createLobbyRoomSchema
  .partial()
  .extend({
    password: z.union([z.string().min(4).max(32), z.literal("")]).optional(),
    clearPassword: z.boolean().optional(),
  });

export const joinLobbyRoomSchema = z.object({
  password: z.string().max(32).optional(),
});

export type LobbyRoomSettings = z.infer<typeof lobbySettingsSchema>;
export type CreateLobbyRoomInput = z.infer<typeof createLobbyRoomSchema>;
export type UpdateLobbyRoomInput = z.infer<typeof updateLobbyRoomSchema>;

export const DEFAULT_LOBBY_SETTINGS: LobbyRoomSettings = {
  tickrate: 128,
  friendlyFire: false,
  weapons: "all",
  overtime: true,
  knifeRound: false,
  autoKick: true,
  voiceRequired: false,
  allowSpectators: true,
  minLevel: 1,
  maxLevel: 20,
  warmupSeconds: 60,
  description: "",
};
