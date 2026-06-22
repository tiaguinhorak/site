import type { NextRequest } from "next/server";
import { handleCsgoProxy } from "@/lib/csgo-api/proxy";

export async function GET(request: NextRequest) {
  return handleCsgoProxy(request, "/api/skins/export", "admin");
}
