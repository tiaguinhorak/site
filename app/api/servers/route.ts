import type { NextRequest } from "next/server";
import { handleCsgoProxy } from "@/lib/csgo-api/proxy";

export async function GET(request: NextRequest) {
  return handleCsgoProxy(request, "/api/servers", "admin");
}

export async function POST(request: NextRequest) {
  return handleCsgoProxy(request, "/api/servers", "admin");
}
