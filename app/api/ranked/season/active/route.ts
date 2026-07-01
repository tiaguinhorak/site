import { NextResponse } from "next/server";
import { getPublicActiveSeasonSummary } from "@/lib/ranked/season-service";

export async function GET() {
  const season = await getPublicActiveSeasonSummary();
  return NextResponse.json({ season });
}
