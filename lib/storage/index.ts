import "server-only";

import { randomUUID } from "node:crypto";
import { getStorageConfig } from "./config";
import { createLocalDriver } from "./local-driver";
import { createR2Driver } from "./r2-driver";
import {
  optimizeAdminImage,
  optimizeAvatar,
  optimizeBanner,
  optimizeClanAvatar,
} from "./optimize";
import type { StoredObject, StorageDriver, UploadFolder } from "./types";
import { keyToPublicPath, publicUrlToKey, versionedPublicPath } from "./urls";

let driver: StorageDriver | null = null;

export function getStorage(): StorageDriver {
  if (driver) return driver;
  const { driver: kind } = getStorageConfig();
  driver = kind === "r2" ? createR2Driver() : createLocalDriver();
  return driver;
}

export { publicUrlToKey, keyToPublicPath, versionedPublicPath };
export { getStorageConfig, getUploadRoot, getUploadPublicBaseUrl } from "./config";

export async function checkStorageHealth(): Promise<{ ok: boolean; error?: string }> {
  return getStorage().checkWritable();
}

export async function deleteByPublicUrl(publicPath: string | null | undefined): Promise<void> {
  const key = publicUrlToKey(publicPath);
  if (!key) return;
  await getStorage().delete(key);
}

const AVATAR_VARIANTS = ["webp", "gif"] as const;
const BANNER_VARIANTS = ["webp", "png", "jpg", "jpeg", "gif"] as const;

export async function deleteUserAvatarVariants(userId: string): Promise<void> {
  await getStorage().deleteMany(
    AVATAR_VARIANTS.map((ext) => `avatars/${userId}.${ext}`),
  );
}

export async function deleteUserBannerVariants(userId: string): Promise<void> {
  await getStorage().deleteMany(
    BANNER_VARIANTS.map((ext) => `banners/${userId}.${ext}`),
  );
}

async function storeOptimized(
  folder: UploadFolder,
  filename: string,
  buffer: Buffer,
  contentType: string,
): Promise<StoredObject> {
  const key = `${folder}/${filename}`;
  await getStorage().write(key, buffer, contentType);
  const publicPath = keyToPublicPath(key);
  return { key, publicPath, contentType, size: buffer.length };
}

export async function storeUserAvatar(userId: string, fileBuffer: Buffer): Promise<StoredObject> {
  await deleteUserAvatarVariants(userId);
  const optimized = await optimizeAvatar(fileBuffer);
  return storeOptimized("avatars", `${userId}.webp`, optimized.buffer, optimized.contentType);
}

export async function storeUserAvatarGif(userId: string, buffer: Buffer): Promise<StoredObject> {
  await getStorage().delete(`avatars/${userId}.webp`);
  return storeOptimized("avatars", `${userId}.gif`, buffer, "image/gif");
}

export async function storeUserBanner(userId: string, fileBuffer: Buffer): Promise<StoredObject> {
  await deleteUserBannerVariants(userId);
  const optimized = await optimizeBanner(fileBuffer);
  return storeOptimized("banners", `${userId}.webp`, optimized.buffer, optimized.contentType);
}

export async function storeUserBannerGif(userId: string, buffer: Buffer): Promise<StoredObject> {
  await getStorage().deleteMany(
    BANNER_VARIANTS.filter((ext) => ext !== "gif").map((ext) => `banners/${userId}.${ext}`),
  );
  return storeOptimized("banners", `${userId}.gif`, buffer, "image/gif");
}

export async function storeClanAvatar(clanId: string, fileBuffer: Buffer): Promise<StoredObject> {
  const optimized = await optimizeClanAvatar(fileBuffer);
  return storeOptimized("clans", `${clanId}.webp`, optimized.buffer, optimized.contentType);
}

export async function storeAdminUpload(
  folder: "news" | "store" | "general",
  fileBuffer: Buffer,
  mimeType: string,
): Promise<StoredObject> {
  const optimized = await optimizeAdminImage(fileBuffer, mimeType);
  const filename = `${randomUUID()}.${optimized.ext}`;
  return storeOptimized(folder, filename, optimized.buffer, optimized.contentType);
}

/** Ranked match GOTV demo (`.dem`), keyed by csgo match id. */
export async function storeMatchDemo(
  matchId: string,
  fileBuffer: Buffer,
): Promise<StoredObject> {
  const safeId = matchId.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safeId) {
    throw new Error("Invalid match id.");
  }
  return storeOptimized("demos", `${safeId}.dem`, fileBuffer, "application/octet-stream");
}
