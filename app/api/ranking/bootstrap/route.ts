import { NextResponse } from "next/server";
import { buildRankingBootstrap } from "@/lib/ranking/ranking-bootstrap";

export async function GET() {
  try {
    const payload = await buildRankingBootstrap();
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api/ranking/bootstrap]", error);
    return NextResponse.json({ error: "Failed to load ranking" }, { status: 500 });
  }
}
