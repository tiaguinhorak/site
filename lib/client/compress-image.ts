type CompressOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxBytes?: number;
};

export async function compressImageFile(
  file: File,
  options?: CompressOptions,
): Promise<Blob> {
  const maxWidth = options?.maxWidth ?? 256;
  const maxHeight = options?.maxHeight ?? 256;
  let quality = options?.quality ?? 0.85;
  const maxBytes = options?.maxBytes ?? 400_000;

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
      canvas.toBlob(resolve, "image/webp", quality),
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
