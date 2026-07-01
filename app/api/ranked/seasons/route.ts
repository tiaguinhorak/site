import { NextResponse } from "next/server";
import { listPublicRankedSeasons } from "@/lib/ranked/season-service";

export async function GET() {
  const seasons = await listPublicRankedSeasons();
  return NextResponse.json({ seasons });
}
