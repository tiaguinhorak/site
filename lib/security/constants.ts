export const LIMITS = {
  email: 254,
  password: 128,
  nickname: 24,
  name: 64,
  phone: 20,
  bio: 280,
  mfaCode: 6,
  jsonBody: 12_000,
  avatarBytes: 2 * 1024 * 1024,
} as const;

export const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

import { SITE_NAME } from "@/lib/brand";

export const SESSION_COOKIE = `${SITE_NAME}_session`;
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export const RATE_LIMITS = {
  auth: { limit: 8, windowMs: 60_000 },
  profile: { limit: 20, windowMs: 60_000 },
  apiRead: { limit: 120, windowMs: 60_000 },
  chat: { limit: 40, windowMs: 60_000 },
} as const;
