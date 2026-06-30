import path from "node:path";
import type { UploadDriver } from "./types";

function readDriver(): UploadDriver {
  const raw = process.env.UPLOAD_DRIVER?.trim().toLowerCase();
  if (raw === "r2") return "r2";
  return "local";
}

/** Filesystem root for local driver (persistent path on VPS). */
export function getUploadRoot(): string {
  const configured = process.env.UPLOAD_ROOT?.trim();
  if (configured) return path.resolve(configured);
  return path.join(process.cwd(), "public", "uploads");
}

/** Public URL prefix — empty = same-origin `/uploads`. For R2/CDN set full base URL. */
export function getUploadPublicBaseUrl(): string {
  const base =
    process.env.UPLOAD_PUBLIC_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_UPLOAD_BASE_URL?.trim() ||
    "";
  return base.replace(/\/+$/, "");
}

export function getStorageConfig() {
  return {
    driver: readDriver(),
    uploadRoot: getUploadRoot(),
    publicBaseUrl: getUploadPublicBaseUrl(),
    r2: {
      accountId: process.env.R2_ACCOUNT_ID?.trim() ?? "",
      accessKeyId: process.env.R2_ACCESS_KEY_ID?.trim() ?? "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY?.trim() ?? "",
      bucket: process.env.R2_BUCKET?.trim() ?? "",
      publicBaseUrl: process.env.R2_PUBLIC_BASE_URL?.trim() ?? "",
    },
  } as const;
}

export function isR2Configured(): boolean {
  const { r2 } = getStorageConfig();
  return Boolean(
    r2.accountId &&
      r2.accessKeyId &&
      r2.secretAccessKey &&
      r2.bucket &&
      r2.publicBaseUrl,
  );
}
