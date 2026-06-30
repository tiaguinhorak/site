import { mkdir, writeFile, unlink, access, constants } from "node:fs/promises";
import path from "node:path";
import type { StorageDriver } from "./types";
import { getUploadRoot } from "./config";

function resolvePath(key: string): string {
  const root = getUploadRoot();
  const normalized = key.replace(/^\/+/, "").replace(/\\/g, "/");
  const full = path.resolve(root, normalized);
  if (!full.startsWith(path.resolve(root))) {
    throw new Error("Invalid storage key.");
  }
  return full;
}

export function createLocalDriver(): StorageDriver {
  return {
    async write(key, buffer, _contentType) {
      const filepath = resolvePath(key);
      await mkdir(path.dirname(filepath), { recursive: true });
      await writeFile(filepath, buffer);
    },

    async delete(key) {
      try {
        await unlink(resolvePath(key));
      } catch {
        // file may not exist
      }
    },

    async deleteMany(keys) {
      await Promise.all(keys.map((key) => this.delete(key)));
    },

    async exists(key) {
      try {
        await access(resolvePath(key), constants.F_OK);
        return true;
      } catch {
        return false;
      }
    },

    async checkWritable() {
      try {
        const root = getUploadRoot();
        await mkdir(root, { recursive: true });
        const probeKey = ".storage-probe";
        const probePath = path.join(root, probeKey);
        await writeFile(probePath, "ok");
        await unlink(probePath);
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}
