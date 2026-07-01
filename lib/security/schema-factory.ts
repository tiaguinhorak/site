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
import type ptBR from "@/messages/pt-BR.json";

export type ValidationMessages = typeof ptBR.validation;

export function createValidationSchemas(v: ValidationMessages) {
  const passwordSchema = z
    .string()
    .min(8, v.password.min8)
    .max(LIMITS.password, v.password.max)
    .regex(/[a-z]/, v.password.lowercase)
    .regex(/[A-Z]/, v.password.uppercase)
    .regex(/[0-9]/, v.password.digit);

  const emailSchema = z
    .string()
    .max(LIMITS.email)
    .transform(sanitizeEmail)
    .pipe(z.email(v.email.invalid));

  const nicknameSchema = z
    .string()
    .transform(sanitizeNickname)
    .pipe(
      z
        .string()
        .min(3, v.nickname.min3)
        .max(LIMITS.nickname)
        .regex(/^[A-Z0-9_]+$/, v.nickname.format),
    );

  const nameSchema = z
    .string()
    .transform((val) => sanitizeText(val, LIMITS.name))
    .pipe(
      z
        .string()
        .min(2, v.name.min2)
        .max(LIMITS.name)
        .regex(/^[\p{L}\s'-]+$/u, v.name.invalid),
    );

  const phoneSchema = z
    .string()
    .transform(sanitizePhoneDigits)
    .pipe(
      z
        .string()
        .refine(
          (val) => val.length === 0 || (val.length >= 8 && val.length <= 15),
          v.phone.invalid,
        ),
    );

  const requiredPhoneSchema = z
    .string()
    .min(1, v.phone.required)
    .transform(sanitizePhoneDigits)
    .pipe(
      z.string().min(8, v.phone.invalid).max(15, v.phone.invalid),
    );

  const countrySchema = z.enum(countryCodes, { message: v.country.invalid });

  const bioSchema = z
    .string()
    .transform((val) => sanitizeText(val, LIMITS.bio))
    .pipe(z.string().max(LIMITS.bio));

  const honeypotSchema = z
    .string()
    .optional()
    .transform((val) => val ?? "")
    .refine((val) => val.length === 0, v.honeypot);

  const loginSchema = z.object({
    nickname: nicknameSchema,
    password: z
      .string()
      .min(1, v.password.required)
      .max(LIMITS.password, v.password.max),
    remember: z.boolean().optional().default(false),
    website: honeypotSchema,
  });

  const registerSchema = z
    .object({
      nickname: nicknameSchema,
      email: emailSchema,
      password: passwordSchema,
      confirmPassword: z.string().min(1, v.password.required).max(LIMITS.password),
      website: honeypotSchema,
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: v.passwordMismatch,
      path: ["confirmPassword"],
    });

  const steamCompleteProfileSchema = z
    .object({
      email: emailSchema,
      firstName: nameSchema,
      lastName: nameSchema,
      phone: requiredPhoneSchema,
      country: countrySchema,
      password: passwordSchema,
      confirmPassword: z.string().min(1, v.password.required).max(LIMITS.password),
      website: honeypotSchema,
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: v.passwordMismatch,
      path: ["confirmPassword"],
    });

  const steamProfileDraftSchema = z.object({
    email: z.string().max(LIMITS.email).optional(),
    firstName: z.string().max(LIMITS.name).optional(),
    lastName: z.string().max(LIMITS.name).optional(),
    phone: z.string().optional(),
    country: countrySchema.optional(),
  });

  const profileUpdateSchema = z.object({
    firstName: nameSchema,
    lastName: nameSchema,
    phone: phoneSchema,
    country: countrySchema,
    bio: bioSchema,
  });

  const profileUpdateWithIdentitySchema = profileUpdateSchema.extend({
    nickname: nicknameSchema,
    email: emailSchema,
  });

  const avatarSourceSchema = z.discriminatedUnion("source", [
    z.object({ source: z.literal("steam") }),
    z.object({
      source: z.literal("preset"),
      presetId: z.enum(avatarPresetIds as [string, ...string[]]),
    }),
  ]);

  const passwordChangeSchema = z
    .object({
      currentPassword: z
        .string()
        .min(1, v.password.currentRequired)
        .max(LIMITS.password),
      newPassword: passwordSchema,
      confirmPassword: z.string().min(1, v.password.required).max(LIMITS.password),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: v.passwordMismatch,
      path: ["confirmPassword"],
    })
    .refine((data) => data.currentPassword !== data.newPassword, {
      message: v.password.different,
      path: ["newPassword"],
    });

  const mfaVerifySchema = z.object({
    code: z
      .string()
      .transform((val) => val.replace(/\D/g, "").slice(0, LIMITS.mfaCode))
      .pipe(z.string().length(LIMITS.mfaCode, v.mfaCode)),
  });

  return {
    loginSchema,
    registerSchema,
    steamCompleteProfileSchema,
    steamProfileDraftSchema,
    profileUpdateSchema,
    profileUpdateWithIdentitySchema,
    avatarSourceSchema,
    passwordChangeSchema,
    mfaVerifySchema,
    firstZodError: (error: z.ZodError) =>
      error.issues[0]?.message ?? v.invalidData,
  };
}
