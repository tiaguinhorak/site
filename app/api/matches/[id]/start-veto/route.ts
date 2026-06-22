import type { NextRequest } from "next/server";
import { handleCsgoProxy } from "@/lib/csgo-api/proxy";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  return handleCsgoProxy(request, "/api/matches/[id]/start-veto", "session", { params });
}
