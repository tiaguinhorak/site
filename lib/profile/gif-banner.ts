import "server-only";

const GIF87A = Buffer.from("GIF87a");
const GIF89A = Buffer.from("GIF89a");
export const BANNER_GIF_LIMITS = {
  maxBytes: 5 * 1024 * 1024,
  maxWidth: 1600,
  maxHeight: 560,
  maxFrames: 150,
} as const;

export type BannerGifValidationResult =
  | { ok: true; width: number; height: number; frameEstimate: number }
  | { ok: false; error: string };

function readUint16LE(buffer: Buffer, offset: number): number {
  return buffer.readUInt16LE(offset);
}

export function validateBannerGifBuffer(buffer: Buffer): BannerGifValidationResult {
  if (buffer.length < 13) {
    return { ok: false, error: "Arquivo GIF inválido." };
  }

  const header = buffer.subarray(0, 6);
  if (!header.equals(GIF87A) && !header.equals(GIF89A)) {
    return { ok: false, error: "O arquivo precisa ser um GIF animado." };
  }

  if (buffer.length > BANNER_GIF_LIMITS.maxBytes) {
    return { ok: false, error: "GIF do banner muito grande (máx. 5 MB)." };
  }

  const width = readUint16LE(buffer, 6);
  const height = readUint16LE(buffer, 8);
  if (width <= 0 || height <= 0) {
    return { ok: false, error: "Dimensões do GIF inválidas." };
  }
  if (width > BANNER_GIF_LIMITS.maxWidth || height > BANNER_GIF_LIMITS.maxHeight) {
    return {
      ok: false,
      error: `GIF do banner deve ter no máximo ${BANNER_GIF_LIMITS.maxWidth}×${BANNER_GIF_LIMITS.maxHeight}px.`,
    };
  }

  let frameEstimate = 0;
  for (let i = 0; i < buffer.length - 1; i += 1) {
    if (buffer[i] === 0x21 && buffer[i + 1] === 0xf9) {
      frameEstimate += 1;
      if (frameEstimate > BANNER_GIF_LIMITS.maxFrames) {
        return {
          ok: false,
          error: `GIF com muitos frames (máx. ${BANNER_GIF_LIMITS.maxFrames}).`,
        };
      }
    }
  }

  if (frameEstimate < 2) {
    return { ok: false, error: "Envie um GIF animado (não estático)." };
  }

  return { ok: true, width, height, frameEstimate };
}
