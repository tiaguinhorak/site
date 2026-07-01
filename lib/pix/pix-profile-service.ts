import "server-only";

import { prisma } from "@/lib/prisma";
import { decryptField, encryptField } from "@/lib/security/field-encryption";
import {
  formatBrazilPhone,
  formatPixKeyInput,
  maskPixKey,
  normalizeBrazilPhone,
  normalizePixKey,
  parsePixKeyType,
  type PixKeyType,
} from "@/lib/pix/pix-key-utils";

export type PixProfileView = {
  pixKeyType: PixKeyType;
  pixKey: string;
  pixKeyMasked: string;
  pixKeyHolderName: string;
  pixContactEmail: string;
  pixContactPhone: string;
  lgpdConsented: boolean;
  hasPixKey: boolean;
};

type PixProfileRow = {
  pixKey: string;
  pixKeyType: string;
  pixKeyHolderName: string;
  pixContactEmail: string;
  pixContactPhone: string;
  pixLgpdConsentedAt?: Date | null;
};

function decryptRow(row: PixProfileRow) {
  const pixKeyType = parsePixKeyType(row.pixKeyType);
  const normalizedKey = normalizePixKey(pixKeyType, decryptField(row.pixKey));
  const pixKeyHolderName = decryptField(row.pixKeyHolderName);
  const pixContactEmail = decryptField(row.pixContactEmail);
  const pixContactPhone = formatBrazilPhone(decryptField(row.pixContactPhone));

  return {
    pixKeyType,
    pixKey: formatPixKeyInput(pixKeyType, normalizedKey),
    pixKeyMasked: maskPixKey(pixKeyType, normalizedKey),
    pixKeyHolderName,
    pixContactEmail,
    pixContactPhone,
    lgpdConsented: Boolean(row.pixLgpdConsentedAt),
    hasPixKey: Boolean(normalizedKey.trim()),
  } satisfies PixProfileView;
}

export async function getPixProfileForUser(userId: string): Promise<PixProfileView | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      pixKey: true,
      pixKeyType: true,
      pixKeyHolderName: true,
      pixContactEmail: true,
      pixContactPhone: true,
      pixLgpdConsentedAt: true,
    },
  });
  if (!user) return null;
  return decryptRow(user);
}

export async function savePixProfileForUser(
  userId: string,
  input: {
    pixKeyType: PixKeyType;
    pixKey: string;
    pixKeyHolderName: string;
    pixContactEmail: string;
    pixContactPhone: string;
    lgpdConsent: boolean;
  },
): Promise<PixProfileView> {
  const normalizedKey = normalizePixKey(input.pixKeyType, input.pixKey);

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      pixKeyType: input.pixKeyType,
      pixKey: encryptField(normalizedKey),
      pixKeyHolderName: encryptField(input.pixKeyHolderName.trim()),
      pixContactEmail: encryptField(input.pixContactEmail.trim().toLowerCase()),
      pixContactPhone: encryptField(normalizeBrazilPhone(input.pixContactPhone)),
      pixLgpdConsentedAt: input.lgpdConsent ? new Date() : null,
    },
    select: {
      pixKey: true,
      pixKeyType: true,
      pixKeyHolderName: true,
      pixContactEmail: true,
      pixContactPhone: true,
      pixLgpdConsentedAt: true,
    },
  });

  return decryptRow(user);
}

/** Decrypts payout fields for admin — never expose in public APIs. */
export function decryptPixFields(row: PixProfileRow) {
  const pixKeyType = parsePixKeyType(row.pixKeyType);
  const pixKey = decryptField(row.pixKey);
  return {
    pixKeyType,
    pixKey,
    pixKeyHolderName: decryptField(row.pixKeyHolderName),
    pixContactEmail: decryptField(row.pixContactEmail),
    pixContactPhone: decryptField(row.pixContactPhone),
  };
}
