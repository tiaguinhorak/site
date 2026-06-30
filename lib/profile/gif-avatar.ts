import "server-only";

const GIF87A = Buffer.from("GIF87a");
const GIF89A = Buffer.from("GIF89a");
const MAX_GIF_BYTES = 3 * 1024 * 1024;
const MAX_GIF_WIDTH = 512;
const MAX_GIF_HEIGHT = 512;
const MAX_GIF_FRAMES = 120;

export type GifValidationResult =
  | { ok: true; width: number; height: number; frameEstimate: number }
  | { ok: false; error: string };

function readUint16LE(buffer: Buffer, offset: number): number {
  return buffer.readUInt16LE(offset);
}

export function validateGifBuffer(buffer: Buffer): GifValidationResult {
  if (buffer.length < 13) {
    return { ok: false, error: "Arquivo GIF inválido." };
  }

  const header = buffer.subarray(0, 6);
  if (!header.equals(GIF87A) && !header.equals(GIF89A)) {
    return { ok: false, error: "O arquivo precisa ser um GIF animado." };
  }

  if (buffer.length > MAX_GIF_BYTES) {
    return { ok: false, error: "GIF muito grande (máx. 3 MB)." };
  }

  const width = readUint16LE(buffer, 6);
  const height = readUint16LE(buffer, 8);
  if (width <= 0 || height <= 0) {
    return { ok: false, error: "Dimensões do GIF inválidas." };
  }
  if (width > MAX_GIF_WIDTH || height > MAX_GIF_HEIGHT) {
    return {
      ok: false,
      error: `GIF deve ter no máximo ${MAX_GIF_WIDTH}×${MAX_GIF_HEIGHT}px.`,
    };
  }

  let frameEstimate = 0;
  for (let i = 0; i < buffer.length - 1; i += 1) {
    if (buffer[i] === 0x21 && buffer[i + 1] === 0xf9) {
      frameEstimate += 1;
      if (frameEstimate > MAX_GIF_FRAMES) {
        return {
          ok: false,
          error: `GIF com muitos frames (máx. ${MAX_GIF_FRAMES}).`,
        };
      }
    }
  }

  if (frameEstimate < 2) {
    return { ok: false, error: "Envie um GIF animado (não estático)." };
  }

  return { ok: true, width, height, frameEstimate };
}
