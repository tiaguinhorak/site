import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const sessions = await prisma.rankedMatchSession.findMany({
    where: { status: { in: ["accepting", "voting", "starting", "live"] } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      matchSource: true,
      selectedMap: true,
      csgoMatchId: true,
      serverHost: true,
      serverPort: true,
      createdAt: true,
      partyA: { select: { members: { select: { userId: true } } } },
      partyB: { select: { members: { select: { userId: true } } } },
    },
  });

  return NextResponse.json({
    sessions: sessions.map((session) => ({
      id: session.id,
      status: session.status,
      matchSource: session.matchSource,
      selectedMap: session.selectedMap ?? null,
      csgoMatchId: session.csgoMatchId ?? null,
      serverHost: session.serverHost ?? null,
      serverPort: session.serverPort ?? null,
      playerCount: session.partyA.members.length + session.partyB.members.length,
      createdAt: session.createdAt.toISOString(),
    })),
  });
}
