import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { readSessionFromCookieHeader } from "@/lib/security/session";
import type { User } from "@/lib/generated/prisma/client";

export async function getSessionUser(
  request: NextRequest,
): Promise<User | null> {
  const session = readSessionFromCookieHeader(request.headers.get("cookie"));
  if (!session) return null;

  return prisma.user.findUnique({ where: { id: session.userId } });
}

export async function getSessionUserId(
  request: NextRequest,
): Promise<string | null> {
  const session = readSessionFromCookieHeader(request.headers.get("cookie"));
  return session?.userId ?? null;
}
