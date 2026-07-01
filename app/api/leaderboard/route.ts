import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session-user";
import { fetchLeaderboardPage } from "@/lib/leaderboard/queries";
import {
  LEADERBOARD_PAGE_SIZE,
  LEADERBOARD_SORT_VALUES,
  type LeaderboardSort,
} from "@/lib/leaderboard/types";

function parseSort(value: string | null): LeaderboardSort {
  if (value && LEADERBOARD_SORT_VALUES.includes(value as LeaderboardSort)) {
    return value as LeaderboardSort;
  }
  return "points";
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = Number(searchParams.get("page") ?? "1");
    const limit = Number(searchParams.get("limit") ?? String(LEADERBOARD_PAGE_SIZE));
    const query = searchParams.get("q") ?? undefined;
    const sort = parseSort(searchParams.get("sort"));
    const seasonId = searchParams.get("seasonId") ?? undefined;

    const sessionUser = await getSessionUser(request);

    const data = await fetchLeaderboardPage({
      page: Number.isFinite(page) ? page : 1,
      limit: Number.isFinite(limit) ? limit : LEADERBOARD_PAGE_SIZE,
      query,
      sort,
      userId: sessionUser?.id,
      seasonId,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("[api/leaderboard]", error);
    return NextResponse.json(
      { error: "Failed to load leaderboard" },
      { status: 500 },
    );
  }
}
