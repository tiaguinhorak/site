import { createHmac, randomBytes } from "crypto";
import type { NextRequest } from "next/server";
import { getAppUrl } from "@/lib/app-url";
import { fetchWithTimeout } from "@/lib/steam/fetch-with-timeout";

const STEAM_OPENID_ENDPOINT = "https://steamcommunity.com/openid/login";
const OPENID_VERIFY_TIMEOUT_MS = 12_000;

export function buildSteamLoginUrl(
  mode: "login" | "register" | "link" | "switch",
  request?: NextRequest,
): string {
  const appUrl = getAppUrl(request);
  const returnTo = `${appUrl}/api/auth/steam/callback?mode=${mode}`;
  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": returnTo,
    "openid.realm": appUrl,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });
  return `${STEAM_OPENID_ENDPOINT}?${params.toString()}`;
}

export async function verifySteamOpenId(
  searchParams: URLSearchParams,
): Promise<string | null> {
  const mode = searchParams.get("openid.mode");
  const claimedId = searchParams.get("openid.claimed_id");
  if (mode !== "id_res" || !claimedId) return null;

  const verifyParams = new URLSearchParams();
  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith("openid.")) {
      verifyParams.set(key, value);
    }
  }
  verifyParams.set("openid.mode", "check_authentication");

  try {
    const response = await fetchWithTimeout(
      STEAM_OPENID_ENDPOINT,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: verifyParams.toString(),
        cache: "no-store",
      },
      OPENID_VERIFY_TIMEOUT_MS,
    );

    const body = await response.text();
    if (!body.includes("is_valid:true")) return null;

    const match = claimedId.match(/\/openid\/id\/(\d+)$/);
    return match?.[1] ?? null;
  } catch (error) {
    console.error("[steam/openid] verify failed:", error);
    return null;
  }
}

export function createSteamStateToken(mode: string): string {
  const payload = JSON.stringify({
    mode,
    exp: Date.now() + 10 * 60 * 1000,
    nonce: randomBytes(8).toString("hex"),
  });
  const secret = process.env.SESSION_SECRET ?? "dev-only-session-secret-min-32-characters!!";
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${Buffer.from(payload, "utf8").toString("base64url")}.${sig}`;
}

export function verifySteamStateToken(token: string, expectedMode: string): boolean {
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return false;
  try {
    const payloadStr = Buffer.from(payloadB64, "base64url").toString("utf8");
    const secret = process.env.SESSION_SECRET ?? "dev-only-session-secret-min-32-characters!!";
    const expected = createHmac("sha256", secret)
      .update(payloadStr)
      .digest("base64url");
    if (expected !== sig) return false;
    const data = JSON.parse(payloadStr) as { mode: string; exp: number };
    return data.mode === expectedMode && data.exp >= Date.now();
  } catch {
    return false;
  }
}

export { getAppUrl } from "@/lib/app-url";
