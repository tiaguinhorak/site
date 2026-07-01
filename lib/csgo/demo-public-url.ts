import { keyToPublicPath } from "@/lib/storage/urls";

/** Absolute URL for a stored ranked demo (required by match-result validation). */
export function absoluteMatchDemoUrl(matchId: string): string {
  const safeId = matchId.replace(/[^a-zA-Z0-9_-]/g, "");
  const path = keyToPublicPath(`demos/${safeId}.dem`);
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const base = (
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    ""
  ).replace(/\/+$/, "");

  if (!base) {
    throw new Error("APP_URL must be set to publish match demo URLs.");
  }

  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
