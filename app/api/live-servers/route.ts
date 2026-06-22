import { NextResponse } from "next/server";
import { fetchLiveServerStats } from "@/lib/csgo-api/live-server-stats";

export async function GET() {
  const servers = await fetchLiveServerStats();
  return NextResponse.json({ servers });
}
