import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { absoluteMatchDemoUrl } from "@/lib/csgo/demo-public-url";
import { isValidSkinsSyncRequest } from "@/lib/env/skins-sync";
import { getUploadRoot } from "@/lib/storage/config";

const SYNC_HEADER = "x-skins-sync-key";
const MATCH_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const providedKey =
    request.headers.get(SYNC_HEADER) ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    null;

  if (!isValidSkinsSyncRequest(providedKey)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const matchId = request.nextUrl.searchParams.get("matchId")?.trim() ?? "";
  if (!MATCH_ID_RE.test(matchId)) {
    return NextResponse.json({ error: "Invalid matchId" }, { status: 400 });
  }

  const body = request.body;
  if (!body) {
    return NextResponse.json({ error: "Empty body" }, { status: 400 });
  }

  const root = getUploadRoot();
  const destDir = path.join(root, "demos");
  const destPath = path.join(destDir, `${matchId}.dem`);
  const resolvedDest = path.resolve(destPath);
  if (!resolvedDest.startsWith(path.resolve(root))) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    await mkdir(destDir, { recursive: true });
    const buffer = Buffer.from(await request.arrayBuffer());
    if (buffer.length === 0) {
      return NextResponse.json({ error: "Empty body" }, { status: 400 });
    }
    await writeFile(resolvedDest, buffer);
  } catch {
    return NextResponse.json({ error: "Failed to store demo" }, { status: 500 });
  }

  let demoUrl: string;
  try {
    demoUrl = absoluteMatchDemoUrl(matchId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "APP_URL not configured";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, demoUrl });
}
