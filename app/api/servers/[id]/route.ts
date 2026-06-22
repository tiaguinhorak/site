import type { NextRequest } from "next/server";
import { handleCsgoProxy } from "@/lib/csgo-api/proxy";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  return handleCsgoProxy(request, "/api/servers/[id]", "admin", { params });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  return handleCsgoProxy(request, "/api/servers/[id]", "admin", { params });
}
