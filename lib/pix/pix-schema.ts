import { z } from "zod";
import type ptBR from "@/messages/pt-BR.json";

type PixMessages = typeof ptBR.pix;

export function createPixProfileSchema(messages: PixMessages) {
  return z.object({
    pixKeyType: z.enum(["PHONE", "EMAIL", "CPF", "CNPJ", "RANDOM"]),
    pixKey: z.string().trim().min(1, messages.errors.keyRequired).max(140),
    pixKeyHolderName: z.string().trim().min(2, messages.errors.holderMin).max(80),
    pixContactEmail: z.string().trim().email(messages.errors.contactEmailInvalid).max(120),
    pixContactPhone: z.string().trim().min(8, messages.errors.contactPhoneRequired).max(32),
    lgpdConsent: z.literal(true, { message: messages.errors.lgpdRequired }),
  });
}
