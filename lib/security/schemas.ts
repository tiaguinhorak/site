import { z } from "zod";
import { LIMITS } from "./constants";
import {
  sanitizeEmail,
  sanitizeNickname,
  sanitizePhoneDigits,
  sanitizeText,
} from "./sanitize";
import { countryCodes } from "@/lib/profile/countries";
import { avatarPresetIds } from "@/lib/profile/avatar-presets";

const passwordSchema = z
  .string()
  .min(8, "Senha deve ter no mínimo 8 caracteres.")
  .max(LIMITS.password, "Senha muito longa.")
  .regex(/[a-z]/, "Senha deve conter uma letra minúscula.")
  .regex(/[A-Z]/, "Senha deve conter uma letra maiúscula.")
  .regex(/[0-9]/, "Senha deve conter um número.");

const emailSchema = z
  .string()
  .max(LIMITS.email)
  .transform(sanitizeEmail)
  .pipe(z.email("E-mail inválido."));

const nicknameSchema = z
  .string()
  .transform(sanitizeNickname)
  .pipe(
    z
      .string()
      .min(3, "Nickname deve ter no mínimo 3 caracteres.")
      .max(LIMITS.nickname)
      .regex(/^[A-Z0-9_]+$/, "Use apenas letras, números e underscore."),
  );

const nameSchema = z
  .string()
  .transform((v) => sanitizeText(v, LIMITS.name))
  .pipe(
    z
      .string()
      .min(2, "Nome deve ter no mínimo 2 caracteres.")
      .max(LIMITS.name)
      .regex(/^[\p{L}\s'-]+$/u, "Nome contém caracteres inválidos."),
  );

const phoneSchema = z
  .string()
  .transform(sanitizePhoneDigits)
  .pipe(
    z
      .string()
      .refine(
        (v) => v.length === 0 || (v.length >= 10 && v.length <= 13),
        "Telefone inválido.",
      ),
  );

const requiredPhoneSchema = z
  .string()
  .min(1, "Telefone obrigatório.")
  .transform(sanitizePhoneDigits)
  .pipe(
    z
      .string()
      .min(10, "Telefone inválido.")
      .max(13, "Telefone inválido."),
  );

const countrySchema = z.enum(countryCodes, { message: "País inválido." });

const bioSchema = z
  .string()
  .transform((v) => sanitizeText(v, LIMITS.bio))
  .pipe(z.string().max(LIMITS.bio));

const honeypotSchema = z
  .string()
  .optional()
  .transform((v) => v ?? "")
  .refine((v) => v.length === 0, "Requisição inválida.");

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, "Senha obrigatória.")
    .max(LIMITS.password, "Senha muito longa."),
  remember: z.boolean().optional().default(false),
  website: honeypotSchema,
});

export const registerSchema = z
  .object({
    nickname: nicknameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().max(LIMITS.password),
    website: honeypotSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

export const steamCompleteProfileSchema = z.object({
  email: emailSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  phone: requiredPhoneSchema,
  country: countrySchema,
  website: honeypotSchema,
});

export const steamProfileDraftSchema = z.object({
  email: z.string().max(LIMITS.email).optional(),
  firstName: z.string().max(LIMITS.name).optional(),
  lastName: z.string().max(LIMITS.name).optional(),
  phone: z.string().optional(),
  country: countrySchema.optional(),
});

export const profileUpdateSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  phone: phoneSchema,
  country: countrySchema,
  bio: bioSchema,
});

export const profileUpdateWithIdentitySchema = profileUpdateSchema.extend({
  nickname: nicknameSchema,
  email: emailSchema,
});

export const avatarSourceSchema = z.discriminatedUnion("source", [
  z.object({ source: z.literal("steam") }),
  z.object({
    source: z.literal("preset"),
    presetId: z.enum(avatarPresetIds as [string, ...string[]]),
  }),
]);

export const passwordChangeSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Senha atual obrigatória.")
      .max(LIMITS.password),
    newPassword: passwordSchema,
    confirmPassword: z.string().max(LIMITS.password),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "A nova senha deve ser diferente da atual.",
    path: ["newPassword"],
  });

export const mfaVerifySchema = z.object({
  code: z
    .string()
    .transform((v) => v.replace(/\D/g, "").slice(0, LIMITS.mfaCode))
    .pipe(
      z
        .string()
        .length(LIMITS.mfaCode, "Código deve ter 6 dígitos."),
    ),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type SteamCompleteProfileInput = z.infer<typeof steamCompleteProfileSchema>;
export type SteamProfileDraftInput = z.infer<typeof steamProfileDraftSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type AvatarSourceInput = z.infer<typeof avatarSourceSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

export function firstZodError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Dados inválidos.";
}
