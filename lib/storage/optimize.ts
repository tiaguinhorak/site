type SharpInstance = import("sharp").Sharp;
type SharpFactory = (input?: Parameters<typeof import("sharp")["default"]>[0]) => SharpInstance;

let sharpFactoryPromise: Promise<SharpFactory> | null = null;

async function getSharp(): Promise<SharpFactory> {
  if (!sharpFactoryPromise) {
    sharpFactoryPromise = import("sharp").then((mod) => mod.default);
  }
  return sharpFactoryPromise;
}

export type OptimizedImage = {
  buffer: Buffer;
  contentType: "image/webp";
  ext: "webp";
};

const WEBP_OPTIONS = { quality: 85, effort: 4 } as const;

export async function optimizeAvatar(buffer: Buffer): Promise<OptimizedImage> {
  const sharp = await getSharp();
  const output = await sharp(buffer)
    .rotate()
    .resize(256, 256, { fit: "cover", position: "centre" })
    .webp(WEBP_OPTIONS)
    .toBuffer();

  return { buffer: output, contentType: "image/webp", ext: "webp" };
}

export async function optimizeClanAvatar(buffer: Buffer): Promise<OptimizedImage> {
  const sharp = await getSharp();
  const output = await sharp(buffer)
    .rotate()
    .resize(256, 256, { fit: "cover", position: "centre" })
    .webp(WEBP_OPTIONS)
    .toBuffer();

  return { buffer: output, contentType: "image/webp", ext: "webp" };
}

export async function optimizeBanner(buffer: Buffer): Promise<OptimizedImage> {
  const sharp = await getSharp();
  const output = await sharp(buffer)
    .rotate()
    .resize(1600, 560, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();

  return { buffer: output, contentType: "image/webp", ext: "webp" };
}

export async function optimizeAdminImage(
  buffer: Buffer,
  mimeType: string,
): Promise<OptimizedImage | { buffer: Buffer; contentType: string; ext: string }> {
  if (mimeType === "image/gif") {
    return { buffer, contentType: "image/gif", ext: "gif" };
  }

  const sharp = await getSharp();
  const output = await sharp(buffer)
    .rotate()
    .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85, effort: 4 })
    .toBuffer();

  return { buffer: output, contentType: "image/webp", ext: "webp" };
}
