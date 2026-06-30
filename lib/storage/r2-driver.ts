import type { StorageDriver } from "./types";
import { getStorageConfig, isR2Configured } from "./config";

function notConfigured(): never {
  throw new Error(
    "UPLOAD_DRIVER=r2 but R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET and R2_PUBLIC_BASE_URL.",
  );
}

/**
 * Cloudflare R2 (S3-compatible). Wire @aws-sdk/client-s3 when switching drivers.
 * Env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL
 */
export function createR2Driver(): StorageDriver {
  if (!isR2Configured()) notConfigured();

  const { r2 } = getStorageConfig();

  return {
    async write(_key, _buffer, _contentType) {
      void r2;
      throw new Error(
        "R2 driver stub: install @aws-sdk/client-s3 and implement PutObject in lib/storage/r2-driver.ts",
      );
    },

    async delete(_key) {
      throw new Error("R2 driver stub: implement DeleteObject.");
    },

    async deleteMany(_keys) {
      throw new Error("R2 driver stub: implement batch delete.");
    },

    async exists(_key) {
      throw new Error("R2 driver stub: implement HeadObject.");
    },

    async checkWritable() {
      if (!isR2Configured()) {
        return { ok: false, error: "R2 credentials incomplete." };
      }
      return {
        ok: false,
        error: "R2 driver not implemented yet — switch UPLOAD_DRIVER=local or finish r2-driver.ts",
      };
    },
  };
}
