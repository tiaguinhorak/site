import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/security/constants";
import { verifySessionToken } from "@/lib/security/session";
import { prisma } from "@/lib/prisma";
import { serializeUser } from "@/lib/serializers";

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (!cookie) {
    return NextResponse.json({ authenticated: false });
  }

  const session = verifySessionToken(cookie);
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    userId: session.userId,
    user: serializeUser(user),
  });
}
