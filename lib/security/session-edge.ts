import { SESSION_COOKIE } from "./constants";

type SessionPayload = {
  userId: string;
  exp: number;
  nonce: string;
  profileComplete?: boolean;
  isAdmin?: boolean;
};

function getEdgeSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  return "dev-only-session-secret-min-32-characters!!";
}

function base64UrlToBytes(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - base64.length % 4) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function verifySessionTokenEdge(
  token: string,
): Promise<SessionPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadB64, signature] = parts;
  if (!payloadB64 || !signature) return null;

  try {
    const payloadStr = new TextDecoder().decode(base64UrlToBytes(payloadB64));
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(getEdgeSecret()),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const mac = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(payloadStr),
    );
    const expected = bytesToBase64Url(new Uint8Array(mac));
    if (expected !== signature) return null;

    const payload = JSON.parse(payloadStr) as SessionPayload;
    if (
      typeof payload.userId !== "string" ||
      typeof payload.exp !== "number" ||
      payload.exp < Date.now()
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function isAuthenticatedEdge(
  cookieHeader: string | null,
): Promise<boolean> {
  if (!cookieHeader) return false;
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  if (!match) return false;
  const token = match.slice(SESSION_COOKIE.length + 1);
  const session = await verifySessionTokenEdge(token);
  return session !== null;
}
