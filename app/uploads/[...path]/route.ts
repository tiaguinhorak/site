import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getUploadRoot } from "@/lib/storage/config";

const MIME: Record<string, string> = {
  webp: "image/webp",
  gif: "image/gif",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

function contentTypeFor(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return MIME[ext] ?? "application/octet-stream";
}

/** Serves uploads from UPLOAD_ROOT when files are stored outside public/uploads (e.g. VPS persistent disk). */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await context.params;
  if (!segments?.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const root = getUploadRoot();
  const relative = segments.join("/");
  const filepath = path.resolve(root, relative);
  if (!filepath.startsWith(path.resolve(root))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const buffer = await readFile(filepath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentTypeFor(relative),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
