import { z } from "zod";
import { getNamespace } from "@/lib/i18n/catalog";
import { createValidationSchemas } from "./schema-factory";

const defaultSchemas = createValidationSchemas(
  getNamespace("pt-BR", "validation"),
);

export const loginSchema = defaultSchemas.loginSchema;
export const registerSchema = defaultSchemas.registerSchema;
export const steamCompleteProfileSchema = defaultSchemas.steamCompleteProfileSchema;
export const steamProfileDraftSchema = defaultSchemas.steamProfileDraftSchema;
export const profileUpdateSchema = defaultSchemas.profileUpdateSchema;
export const profileUpdateWithIdentitySchema =
  defaultSchemas.profileUpdateWithIdentitySchema;
export const avatarSourceSchema = defaultSchemas.avatarSourceSchema;
export const passwordChangeSchema = defaultSchemas.passwordChangeSchema;
export const mfaVerifySchema = defaultSchemas.mfaVerifySchema;

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
  return defaultSchemas.firstZodError(error);
}

export { createValidationSchemas } from "./schema-factory";
