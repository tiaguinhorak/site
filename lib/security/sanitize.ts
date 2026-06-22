import { LIMITS } from "./constants";

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const HTML_TAG = /<[^>]*>/g;
const DANGEROUS = /[<>'"`;]/g;

export function stripControlChars(value: string): string {
  return value.replace(CONTROL_CHARS, "");
}

export function stripHtml(value: string): string {
  return value.replace(HTML_TAG, "");
}

export function sanitizeText(value: string, maxLength: number): string {
  return stripControlChars(stripHtml(value))
    .replace(DANGEROUS, "")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeEmail(value: string): string {
  return stripControlChars(value).trim().toLowerCase().slice(0, LIMITS.email);
}

export function sanitizeNickname(value: string): string {
  return stripControlChars(value)
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "")
    .slice(0, LIMITS.nickname);
}

export function sanitizePhoneDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 15);
}

export function formatPhoneBR(value: string): string {
  const digits = sanitizePhoneDigits(value);
  if (!digits) return "";

  if (digits.length <= 2) return `+${digits}`;
  if (digits.length <= 4) return `+${digits.slice(0, 2)} (${digits.slice(2)}`;
  if (digits.length <= 9) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4)}`;
  }
  return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
