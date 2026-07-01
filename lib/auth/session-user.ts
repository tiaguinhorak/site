import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prisma-retry";
import { readSessionFromCookieHeader } from "@/lib/security/session";
import type { User } from "@/lib/generated/prisma/client";

export async function getSessionUser(
  request: NextRequest,
): Promise<User | null> {
  const session = readSessionFromCookieHeader(request.headers.get("cookie"));
  if (!session) return null;

  return withPrismaRetry(() =>
    prisma.user.findUnique({ where: { id: session.userId } }),
  );
}

export async function getSessionUserFromCookies(): Promise<User | null> {
  const cookieStore = await cookies();
  const session = readSessionFromCookieHeader(cookieStore.toString());
  if (!session) return null;

  return withPrismaRetry(() =>
    prisma.user.findUnique({ where: { id: session.userId } }),
  );
}

/** Reads user id from signed session cookie — no database round-trip. */
export async function getSessionUserIdFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const session = readSessionFromCookieHeader(cookieStore.toString());
  return session?.userId ?? null;
}

export async function getSessionUserId(
  request: NextRequest,
): Promise<string | null> {
  const session = readSessionFromCookieHeader(request.headers.get("cookie"));
  return session?.userId ?? null;
}
