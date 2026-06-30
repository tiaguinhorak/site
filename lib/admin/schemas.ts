import { z } from "zod";
import { LIMITS } from "@/lib/security/constants";
import { normalizeSlugPart } from "@/lib/i18n-content";
import {
  sanitizeEmail,
  sanitizeNickname,
  sanitizeText,
} from "@/lib/security/sanitize";

const planSchema = z.enum(["FREE", "PREMIUM", "ELITE"]);
const notificationTypeSchema = z.enum(["SYSTEM", "MATCH", "SOCIAL", "PROMO"]);
const punishmentTypeSchema = z.enum(["BAN", "MUTE", "WARNING", "KICK", "RESTRICT"]);
const punishmentScopeSchema = z.enum(["PLATFORM", "SERVER"]);

export const adminUserUpdateSchema = z.object({
  nickname: z
    .string()
    .transform(sanitizeNickname)
    .pipe(
      z
        .string()
        .min(3)
        .max(LIMITS.nickname)
        .regex(/^[A-Z0-9_]+$/, "Nickname inválido."),
    )
    .optional(),
  email: z
    .string()
    .max(LIMITS.email)
    .transform(sanitizeEmail)
    .pipe(z.email("E-mail inválido."))
    .optional()
    .nullable(),
  firstName: z
    .string()
    .transform((v) => sanitizeText(v, LIMITS.name))
    .optional(),
  lastName: z
    .string()
    .transform((v) => sanitizeText(v, LIMITS.name))
    .optional(),
  phone: z.string().max(32).optional(),
  country: z.string().min(2).max(2).optional(),
  bio: z
    .string()
    .transform((v) => sanitizeText(v, LIMITS.bio))
    .optional(),
  plan: planSchema.optional(),
  isAdmin: z.boolean().optional(),
  rank: z.number().int().min(0).max(999999).optional(),
  elo: z.number().int().min(0).max(99999).optional(),
  kd: z.number().min(0).max(99).optional(),
  matches: z.number().int().min(0).max(999999).optional(),
  winRate: z.number().int().min(0).max(100).optional(),
  hoursPlayed: z.number().int().min(0).max(999999).optional(),
  anticheatInstalled: z.boolean().optional(),
  mfaEnabled: z.boolean().optional(),
});

export const adminNotificationSendSchema = z.object({
  title: z
    .string()
    .min(2, "Título muito curto.")
    .max(120)
    .transform((v) => sanitizeText(v, 120)),
  body: z
    .string()
    .min(2, "Mensagem muito curta.")
    .max(500)
    .transform((v) => sanitizeText(v, 500)),
  type: notificationTypeSchema.default("SYSTEM"),
  userId: z.string().min(1).optional(),
  broadcast: z.boolean().optional(),
  autoTranslate: z.boolean().optional(),
  actionHref: z
    .string()
    .max(200)
    .transform((v) => sanitizeText(v, 200))
    .optional()
    .nullable(),
  translations: z
    .object({
      en: z
        .object({
          title: z.string().max(120).optional(),
          body: z.string().max(500).optional(),
        })
        .optional(),
      es: z
        .object({
          title: z.string().max(120).optional(),
          body: z.string().max(500).optional(),
        })
        .optional(),
    })
    .optional()
    .nullable(),
});

export const adminPunishmentCreateSchema = z.object({
  userId: z.string().min(1),
  type: punishmentTypeSchema,
  scope: punishmentScopeSchema.default("PLATFORM"),
  serverName: z
    .string()
    .max(80)
    .transform((v) => sanitizeText(v, 80))
    .optional(),
  reason: z
    .string()
    .min(3, "Descreva o motivo.")
    .max(300)
    .transform((v) => sanitizeText(v, 300)),
  notes: z
    .string()
    .max(500)
    .transform((v) => sanitizeText(v, 500))
    .optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  durationDays: z.number().int().min(1).max(3650).optional(),
});

export const adminServerCreateSchema = z.object({
  name: z.string().min(2).max(80).transform((v) => sanitizeText(v, 80)),
  map: z.string().min(2).max(80).transform((v) => sanitizeText(v, 80)),
  mode: z.string().min(2).max(40).transform((v) => sanitizeText(v, 40)),
  players: z.number().int().min(0).max(128).default(0),
  slots: z.number().int().min(1).max(128),
  ping: z.number().int().min(0).max(999).default(0),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export const adminServerUpdateSchema = adminServerCreateSchema.partial();

const newsSlugSchema = z
  .union([z.string(), z.undefined(), z.null()])
  .optional()
  .transform((v) => {
    const trimmed = (v ?? "").trim();
    if (!trimmed) return undefined;
    return normalizeSlugPart(trimmed).slice(0, 100);
  })
  .pipe(
    z.union([
      z.undefined(),
      z
        .string()
        .min(3)
        .max(100)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    ]),
  );

export const adminNewsCreateSchema = z.object({
  title: z.string().min(4).max(160).transform((v) => sanitizeText(v, 160)),
  excerpt: z.string().min(10).max(400).transform((v) => sanitizeText(v, 400)),
  body: z.string().max(20000).default(""),
  slug: newsSlugSchema,
  category: z.string().min(2).max(40).transform((v) => sanitizeText(v, 40)),
  imageAccent: z.string().min(3).max(120).transform((v) => sanitizeText(v, 120)),
  imageUrl: z
    .string()
    .max(500)
    .optional()
    .nullable()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  featured: z.boolean().default(false),
  publishedAt: z.string().datetime().optional(),
});

export const adminNewsUpdateSchema = adminNewsCreateSchema.partial().extend({
  archived: z.boolean().optional(),
});

const adminStoreBaseSchema = z.object({
  name: z.string().min(2).max(80).transform((v) => sanitizeText(v, 80)),
  type: z.string().min(2).max(40).transform((v) => sanitizeText(v, 40)),
  productKind: z.enum(["SKIN", "PACKAGE", "CASE", "AGENT"]).default("SKIN"),
  priceCents: z.number().int().min(0).max(99999999),
  originalCents: z.number().int().min(0).max(99999999).optional().nullable(),
  coinPrice: z.number().int().min(0).max(9999999).optional().nullable(),
  badge: z.string().min(1).max(40).transform((v) => sanitizeText(v, 40)),
  description: z.string().min(4).max(300).transform((v) => sanitizeText(v, 300)),
  accent: z.string().min(3).max(120).transform((v) => sanitizeText(v, 120)),
  imageUrl: z
    .string()
    .max(500)
    .optional()
    .nullable()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  enabled: z.boolean().default(true),
  trending: z.boolean().default(false),
  featured: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  maxPerUser: z.number().int().min(1).max(9999).optional().nullable(),
  coinShopOnly: z.boolean().default(false),
});

export const adminStoreCreateSchema = adminStoreBaseSchema.superRefine((data, ctx) => {
  if (data.coinShopOnly && (!data.coinPrice || data.coinPrice <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Itens exclusivos da loja de moedas precisam de preço em moedas.",
      path: ["coinPrice"],
    });
  }
});

export const adminStoreUpdateSchema = adminStoreBaseSchema.partial();

export const adminStoreRewardSchema = z.object({
  kind: z.enum(["CATALOG_SKIN", "AGENT", "STICKER"]),
  catalogSkinId: z.string().min(1).optional().nullable(),
  agentDefIndex: z.number().int().min(1).optional().nullable(),
  stickerDefIndex: z.number().int().min(1).optional().nullable(),
  weight: z.number().int().min(1).max(100000).default(100),
  quantity: z.number().int().min(1).max(99).default(1),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export const adminStoreRewardsPutSchema = z.object({
  productKind: z.enum(["SKIN", "PACKAGE", "CASE", "AGENT"]).optional(),
  rewards: z.array(adminStoreRewardSchema).max(50),
});

export const adminGameModeCreateSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(40)
    .transform((v) => sanitizeText(v, 40).toLowerCase().replace(/\s+/g, "-"))
    .pipe(z.string().regex(/^[a-z0-9-]+$/, "Slug inválido.")),
  name: z.string().min(2).max(60).transform((v) => sanitizeText(v, 60)),
  accent: z.string().min(3).max(80).transform((v) => sanitizeText(v, 80)),
  tagline: z.string().max(80).transform((v) => sanitizeText(v, 80)).optional(),
  description: z.string().max(300).transform((v) => sanitizeText(v, 300)).optional(),
  iconKey: z.string().min(2).max(40).transform((v) => sanitizeText(v, 40)).optional(),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export const adminGameModeUpdateSchema = adminGameModeCreateSchema.partial();

export const adminGameModeRoomCreateSchema = z.object({
  name: z.string().min(2).max(80).transform((v) => sanitizeText(v, 80)),
  map: z.string().min(2).max(80).transform((v) => sanitizeText(v, 80)),
  players: z.number().int().min(0).max(128).default(0),
  slots: z.number().int().min(1).max(128),
  ping: z.number().int().min(0).max(999).default(0),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export const adminGameModeRoomUpdateSchema = adminGameModeRoomCreateSchema.partial();

export const adminRankedQueueRestrictSchema = z.object({
  minutes: z.number().int().min(1).max(10080),
  reason: z
    .string()
    .min(3, "Descreva o motivo.")
    .max(300)
    .transform((v) => sanitizeText(v, 300)),
  incrementDodge: z.boolean().optional().default(true),
});

export const adminRankedQueueClearSchema = z.object({
  resetDodges: z.boolean().optional().default(false),
});

export const adminCatalogSkinCreateSchema = z.object({
  weaponId: z.string().min(3).max(64).transform((v) => sanitizeText(v, 64).toLowerCase()),
  paintkit: z.number().int().positive(),
  enabled: z.boolean().optional().default(true),
  paintkitName: z.string().max(80).transform((v) => sanitizeText(v, 80)).optional(),
  imageUrl: z.string().url().max(500).optional().nullable(),
});

export const adminCatalogSkinImportSchema = z.object({
  weaponId: z.string().min(3).max(64).transform((v) => sanitizeText(v, 64).toLowerCase()),
  enabled: z.boolean().optional().default(true),
});

export const adminCatalogSkinUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  imageUrl: z.string().url().max(500).optional().nullable(),
  paintkitName: z.string().min(1).max(80).transform((v) => sanitizeText(v, 80)).optional(),
});

export const adminStickerCatalogCreateSchema = z.object({
  defIndex: z.number().int().positive(),
  enabled: z.boolean().optional().default(true),
});

export const adminStickerCatalogUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  imageUrl: z.string().url().max(500).optional().nullable(),
});

export const adminInventoryGrantSchema = z.object({
  catalogSkinId: z.string().min(1).max(64),
});
