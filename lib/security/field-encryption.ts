import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const PREFIX = "enc:v1:";

function deriveKey(): Buffer {
  const raw =
    process.env.PIX_ENCRYPTION_KEY?.trim() ||
    process.env.SESSION_SECRET?.trim() ||
    "";
  if (!raw || raw.length < 16) {
    throw new Error("PIX_ENCRYPTION_KEY ou SESSION_SECRET deve estar configurado (mín. 16 caracteres).");
  }
  return createHash("sha256").update(raw, "utf8").digest();
}

export function encryptField(plaintext: string): string {
  const value = plaintext.trim();
  if (!value) return "";

  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, encrypted]).toString("base64url");
  return `${PREFIX}${payload}`;
}

export function decryptField(stored: string): string {
  const value = stored.trim();
  if (!value) return "";
  if (!value.startsWith(PREFIX)) return value;

  const key = deriveKey();
  const raw = Buffer.from(value.slice(PREFIX.length), "base64url");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function isEncryptedField(stored: string): boolean {
  return stored.trim().startsWith(PREFIX);
}
