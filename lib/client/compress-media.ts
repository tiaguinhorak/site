export type CompressOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxBytes?: number;
  mimeType?: "image/webp" | "image/jpeg" | "image/png";
};

export type CropTransform = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

export type CropAspect = "square" | "banner";

export const CROP_OUTPUT = {
  square: { width: 512, height: 512, maxBytes: 400_000 },
  avatar: { width: 512, height: 512, maxBytes: 400_000 },
  banner: { width: 1600, height: 560, maxBytes: 900_000 },
} as const;

export const GIF_LIMITS = {
  maxBytes: 3 * 1024 * 1024,
  maxWidth: 512,
  maxHeight: 512,
} as const;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function validateImageFileType(file: File): boolean {
  return ALLOWED_IMAGE_TYPES.has(file.type);
}

export async function compressImageFile(
  file: File,
  options?: CompressOptions,
): Promise<Blob> {
  const maxWidth = options?.maxWidth ?? 256;
  const maxHeight = options?.maxHeight ?? 256;
  let quality = options?.quality ?? 0.85;
  const maxBytes = options?.maxBytes ?? 400_000;
  const mimeType = options?.mimeType ?? "image/webp";

  const bitmap = await createImageBitmap(file);
  let width = bitmap.width;
  let height = bitmap.height;
  const ratio = Math.min(1, maxWidth / width, maxHeight / height);
  width = Math.round(width * ratio);
  height = Math.round(height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Não foi possível processar a imagem.");
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let blob: Blob | null = null;
  while (quality >= 0.45) {
    blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, mimeType, quality),
    );
    if (!blob) break;
    if (blob.size <= maxBytes) return blob;
    quality -= 0.08;
  }

  if (!blob) {
    throw new Error("Não foi possível comprimir a imagem.");
  }
  return blob;
}

export async function compressBannerFile(file: File): Promise<Blob> {
  return compressImageFile(file, {
    maxWidth: CROP_OUTPUT.banner.width,
    maxHeight: CROP_OUTPUT.banner.height,
    maxBytes: CROP_OUTPUT.banner.maxBytes,
    quality: 0.88,
    mimeType: "image/webp",
  });
}

export async function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  const response = await fetch(url, { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) {
    throw new Error("Não foi possível carregar a imagem.");
  }
  const blob = await response.blob();
  return loadImageFromFile(new File([blob], "image.webp", { type: blob.type || "image/webp" }));
}

export function applyZoomAroundCenter(
  transform: CropTransform,
  image: HTMLImageElement,
  viewportWidth: number,
  viewportHeight: number,
  oldZoom: number,
  newZoom: number,
): CropTransform {
  const cx = viewportWidth / 2;
  const cy = viewportHeight / 2;
  const oldScale = transform.scale * oldZoom;
  const newScale = transform.scale * newZoom;
  const imgCx = transform.offsetX + (image.naturalWidth * oldScale) / 2;
  const imgCy = transform.offsetY + (image.naturalHeight * oldScale) / 2;

  return {
    scale: transform.scale,
    offsetX: imgCx - (image.naturalWidth * newScale) / 2,
    offsetY: imgCy - (image.naturalHeight * newScale) / 2,
  };
}

export async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Não foi possível carregar a imagem."));
      image.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function getCropAspectRatio(aspect: CropAspect): number {
  if (aspect === "banner") {
    return CROP_OUTPUT.banner.width / CROP_OUTPUT.banner.height;
  }
  return 1;
}

export function getInitialCropTransform(
  imageWidth: number,
  imageHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): CropTransform {
  const scale = Math.max(viewportWidth / imageWidth, viewportHeight / imageHeight);
  return {
    scale,
    offsetX: (viewportWidth - imageWidth * scale) / 2,
    offsetY: (viewportHeight - imageHeight * scale) / 2,
  };
}

export function renderCroppedImage(
  image: HTMLImageElement,
  transform: CropTransform,
  viewportWidth: number,
  viewportHeight: number,
  outputWidth: number,
  outputHeight: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Não foi possível processar a imagem.");
  }

  const { scale, offsetX, offsetY } = transform;
  const sourceX = Math.max(0, -offsetX / scale);
  const sourceY = Math.max(0, -offsetY / scale);
  const sourceW = Math.min(image.naturalWidth - sourceX, viewportWidth / scale);
  const sourceH = Math.min(image.naturalHeight - sourceY, viewportHeight / scale);

  ctx.drawImage(image, sourceX, sourceY, sourceW, sourceH, 0, 0, outputWidth, outputHeight);
  return canvas;
}

export async function exportCroppedBlob(
  image: HTMLImageElement,
  aspect: CropAspect,
  transform: CropTransform,
  viewportWidth: number,
  viewportHeight: number,
): Promise<Blob> {
  const output = aspect === "banner" ? CROP_OUTPUT.banner : CROP_OUTPUT.square;

  const canvas = renderCroppedImage(
    image,
    transform,
    viewportWidth,
    viewportHeight,
    output.width,
    output.height,
  );

  let quality = 0.9;
  let blob: Blob | null = null;
  while (quality >= 0.5) {
    blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality),
    );
    if (!blob) break;
    if (blob.size <= output.maxBytes) return blob;
    quality -= 0.08;
  }

  if (!blob) {
    throw new Error("Não foi possível exportar a imagem.");
  }
  return blob;
}

export async function validateGifFile(file: File): Promise<{ ok: true } | { ok: false; error: string }> {
  if (file.type !== "image/gif") {
    return { ok: false, error: "Envie um arquivo GIF animado." };
  }
  if (file.size > GIF_LIMITS.maxBytes) {
    return { ok: false, error: "GIF muito grande (máx. 3 MB)." };
  }

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 10) {
    return { ok: false, error: "Arquivo GIF inválido." };
  }

  const header = String.fromCharCode(...bytes.slice(0, 6));
  if (header !== "GIF87a" && header !== "GIF89a") {
    return { ok: false, error: "O arquivo precisa ser um GIF animado." };
  }

  const width = bytes[6]! + (bytes[7]! << 8);
  const height = bytes[8]! + (bytes[9]! << 8);
  if (width > GIF_LIMITS.maxWidth || height > GIF_LIMITS.maxHeight) {
    return {
      ok: false,
      error: `GIF deve ter no máximo ${GIF_LIMITS.maxWidth}×${GIF_LIMITS.maxHeight}px.`,
    };
  }

  return { ok: true };
}

const BANNER_GIF_LIMITS = {
  maxBytes: 5 * 1024 * 1024,
  maxWidth: 1600,
  maxHeight: 560,
} as const;

export async function validateBannerGifFile(
  file: File,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (file.type !== "image/gif") {
    return { ok: false, error: "Envie um arquivo GIF animado." };
  }
  if (file.size > BANNER_GIF_LIMITS.maxBytes) {
    return { ok: false, error: "GIF do banner muito grande (máx. 5 MB)." };
  }

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 10) {
    return { ok: false, error: "Arquivo GIF inválido." };
  }

  const header = String.fromCharCode(...bytes.slice(0, 6));
  if (header !== "GIF87a" && header !== "GIF89a") {
    return { ok: false, error: "O arquivo precisa ser um GIF animado." };
  }

  const width = bytes[6]! + (bytes[7]! << 8);
  const height = bytes[8]! + (bytes[9]! << 8);
  if (width > BANNER_GIF_LIMITS.maxWidth || height > BANNER_GIF_LIMITS.maxHeight) {
    return {
      ok: false,
      error: `GIF do banner deve ter no máximo ${BANNER_GIF_LIMITS.maxWidth}×${BANNER_GIF_LIMITS.maxHeight}px.`,
    };
  }

  return { ok: true };
}

export async function compressGifFile(file: File): Promise<File> {
  const validation = await validateGifFile(file);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const width = bytes[6]! + (bytes[7]! << 8);
  const height = bytes[8]! + (bytes[9]! << 8);

  if (
    file.size <= GIF_LIMITS.maxBytes * 0.85 &&
    width <= GIF_LIMITS.maxWidth &&
    height <= GIF_LIMITS.maxHeight
  ) {
    return file;
  }

  const image = await loadImageFromFile(file);
  const scale = Math.min(
    1,
    GIF_LIMITS.maxWidth / image.naturalWidth,
    GIF_LIMITS.maxHeight / image.naturalHeight,
  );
  if (scale >= 1) {
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Não foi possível comprimir o GIF.");
  }
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.85),
  );
  if (!blob) {
    throw new Error(
      "GIF muito grande. Reduza dimensões/frames ou use um arquivo menor.",
    );
  }

  return new File([blob], "avatar.webp", { type: "image/webp" });
}
