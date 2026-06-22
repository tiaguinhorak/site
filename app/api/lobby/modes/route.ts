import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CASUAL_MODE_SLUGS = new Set(["competitive"]);

export async function GET() {
  const modes = await prisma.gameMode.findMany({
    where: { slug: { notIn: [...CASUAL_MODE_SLUGS] } },
    orderBy: { sortOrder: "asc" },
    select: { id: true, slug: true, name: true, accent: true, tagline: true },
  });
  return NextResponse.json({ modes });
}
